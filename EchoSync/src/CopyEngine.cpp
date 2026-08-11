#include "../include/CopyEngine.hpp"
#include "../include/Logger.hpp"
#include <filesystem>
#include <vector>
#include <thread>
namespace EchoSync {

namespace fs = std::filesystem;

bool CopyEngine::EnsureDirectoryExists(const std::wstring& dirPath) {
    if (dirPath.empty()) return true;
    std::error_code ec;
    if (fs::exists(dirPath, ec)) return true;

    return fs::create_directories(dirPath, ec);
}

bool CopyEngine::CopyFileChunked(const std::wstring& srcPath, const std::wstring& destPath, uint64_t* outBytesTransferred) {
    if (outBytesTransferred) *outBytesTransferred = 0;

    // Ensure target directory exists
    std::wstring destDir = fs::path(destPath).parent_path().wstring();
    if (!EnsureDirectoryExists(destDir)) {
        Logger::Instance().Error("CopyEngine", "Failed to create target directory: " + WStringToString(destDir));
        return false;
    }

    // Open source file for read with sharing, retry if temporarily unavailable (e.g., file still being written)
    const int maxRetries = 5;
    const DWORD retryDelayMs = 200; // 200ms between attempts
    HANDLE hSrc = INVALID_HANDLE_VALUE;
    for (int attempt = 0; attempt < maxRetries; ++attempt) {
        hSrc = CreateFileW(
            srcPath.c_str(),
            GENERIC_READ,
            FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
            nullptr,
            OPEN_EXISTING,
            FILE_FLAG_SEQUENTIAL_SCAN,
            nullptr);
        if (hSrc != INVALID_HANDLE_VALUE) {
            break; // success
        }
        DWORD err = GetLastError();
        if (err == ERROR_SHARING_VIOLATION || err == ERROR_LOCK_VIOLATION) {
            Logger::Instance().Info("CopyEngine", "Source file locked, retrying... (attempt " + std::to_string(attempt + 1) + ")");
            std::this_thread::sleep_for(std::chrono::milliseconds(retryDelayMs));
            continue;
        }
        Logger::Instance().Error("CopyEngine", "Failed to open source file for reading. Path: " +
            WStringToString(srcPath) + ". Error: " + std::to_string(err));
        return false;
    }
    if (hSrc == INVALID_HANDLE_VALUE) {
        Logger::Instance().Error("CopyEngine", "Failed to open source file after retries. Path: " +
            WStringToString(srcPath));
        return false;
    }

    // Write to temporary target file for atomic swap
    std::wstring tempDestPath = destPath + L".echosync.tmp";

    HANDLE hDest = CreateFileW(
        tempDestPath.c_str(),
        GENERIC_WRITE,
        0,
        NULL,
        CREATE_ALWAYS,
        FILE_ATTRIBUTE_TEMPORARY | FILE_FLAG_SEQUENTIAL_SCAN,
        NULL
    );

    if (hDest == INVALID_HANDLE_VALUE) {
        DWORD err = GetLastError();
        CloseHandle(hSrc);
        Logger::Instance().Error("CopyEngine", "Failed to open temporary destination file for writing. Path: " +
            WStringToString(tempDestPath) + ". Error: " + std::to_string(err));
        return false;
    }

    std::vector<uint8_t> buffer(CHUNK_SIZE);
    DWORD bytesRead = 0;
    DWORD bytesWritten = 0;
    uint64_t totalBytes = 0;
    bool copySuccess = true;

    while (ReadFile(hSrc, buffer.data(), CHUNK_SIZE, &bytesRead, NULL) && bytesRead > 0) {
        if (!WriteFile(hDest, buffer.data(), bytesRead, &bytesWritten, NULL) || bytesWritten != bytesRead) {
            DWORD err = GetLastError();
            Logger::Instance().Error("CopyEngine", "WriteFile failed on temporary file. Error: " + std::to_string(err));
            copySuccess = false;
            break;
        }
        totalBytes += bytesWritten;
    }

    // Preserve timestamps
    FILETIME ftCreate, ftAccess, ftWrite;
    if (copySuccess && GetFileTime(hSrc, &ftCreate, &ftAccess, &ftWrite)) {
        SetFileTime(hDest, &ftCreate, &ftAccess, &ftWrite);
    }

    CloseHandle(hSrc);
    CloseHandle(hDest);

    if (!copySuccess) {
        DeleteFileW(tempDestPath.c_str());
        return false;
    }

    // Atomic swap into final target destination
    BOOL moveSuccess = MoveFileExW(tempDestPath.c_str(), destPath.c_str(), MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH);
    if (!moveSuccess) {
        DWORD err = GetLastError();
        Logger::Instance().Error("CopyEngine", "MoveFileExW atomic swap failed for target: " +
            WStringToString(destPath) + ". Error: " + std::to_string(err));
        DeleteFileW(tempDestPath.c_str());
        return false;
    }

    // Sync attributes (e.g. read-only, hidden)
    DWORD srcAttrs = GetFileAttributesW(srcPath.c_str());
    if (srcAttrs != INVALID_FILE_ATTRIBUTES) {
        SetFileAttributesW(destPath.c_str(), srcAttrs);
    }

    if (outBytesTransferred) *outBytesTransferred = totalBytes;
    return true;
}

bool CopyEngine::MoveFileOrDir(const std::wstring& oldDestPath, const std::wstring& newDestPath) {
    std::wstring newDir = fs::path(newDestPath).parent_path().wstring();
    EnsureDirectoryExists(newDir);

    BOOL res = MoveFileExW(oldDestPath.c_str(), newDestPath.c_str(), MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH);
    if (!res) {
        DWORD err = GetLastError();
        Logger::Instance().Error("CopyEngine", "MoveFileOrDir failed from " +
            WStringToString(oldDestPath) + " to " +
            WStringToString(newDestPath) + ". Error: " + std::to_string(err));
        return false;
    }
    return true;
}

bool CopyEngine::DeleteFileOrDir(const std::wstring& destPath) {
    std::error_code ec;
    if (!fs::exists(destPath, ec)) return true;

    if (fs::is_directory(destPath, ec)) {
        return fs::remove_all(destPath, ec) > 0;
    } else {
        // Clear read-only attribute if set before delete
        DWORD attrs = GetFileAttributesW(destPath.c_str());
        if (attrs != INVALID_FILE_ATTRIBUTES && (attrs & FILE_ATTRIBUTE_READONLY)) {
            SetFileAttributesW(destPath.c_str(), attrs & ~FILE_ATTRIBUTE_READONLY);
        }
        return DeleteFileW(destPath.c_str()) != 0;
    }
}

bool CopyEngine::SyncFileMetadata(const std::wstring& srcPath, const std::wstring& destPath) {
    HANDLE hSrc = CreateFileW(srcPath.c_str(), GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, NULL, OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS, NULL);
    if (hSrc == INVALID_HANDLE_VALUE) return false;

    HANDLE hDest = CreateFileW(destPath.c_str(), FILE_WRITE_ATTRIBUTES, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, NULL, OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS, NULL);
    if (hDest == INVALID_HANDLE_VALUE) {
        CloseHandle(hSrc);
        return false;
    }

    FILETIME ftCreate, ftAccess, ftWrite;
    bool res = false;
    if (GetFileTime(hSrc, &ftCreate, &ftAccess, &ftWrite)) {
        res = SetFileTime(hDest, &ftCreate, &ftAccess, &ftWrite) != 0;
    }

    CloseHandle(hSrc);
    CloseHandle(hDest);
    return res;
}

} // namespace EchoSync

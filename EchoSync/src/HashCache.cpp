#include "../include/HashCache.hpp"
#include "../include/Logger.hpp"
#include <windows.h>
#include <vector>

namespace EchoSync {

uint64_t HashCache::GetOrComputeHash(const std::wstring& fullPath, const FILETIME& lastWriteTime, uint64_t fileSize) {
    uint64_t pathHash = HashPath(fullPath);

    {
        std::lock_guard<std::mutex> lock(m_mutex);
        auto it = m_hashCache.find(pathHash);
        if (it != m_hashCache.end()) {
            if (it->second.fileSize == fileSize &&
                it->second.lastWriteTime.dwLowDateTime == lastWriteTime.dwLowDateTime &&
                it->second.lastWriteTime.dwHighDateTime == lastWriteTime.dwHighDateTime) {
                return it->second.contentHash; // Fast pass: 0 ms file reopen avoidance!
            }
        }
    }

    // Compute fresh hash
    uint64_t freshHash = ComputeFileHash(fullPath);

    {
        std::lock_guard<std::mutex> lock(m_mutex);
        m_hashCache[pathHash] = CachedHashEntry{
            .lastWriteTime = lastWriteTime,
            .fileSize = fileSize,
            .contentHash = freshHash
        };
    }

    return freshHash;
}

void HashCache::Invalidate(const std::wstring& fullPath) {
    uint64_t pathHash = HashPath(fullPath);
    std::lock_guard<std::mutex> lock(m_mutex);
    m_hashCache.erase(pathHash);
}

void HashCache::Clear() {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_hashCache.clear();
}

uint64_t HashCache::ComputeFileHash(const std::wstring& fullPath) const {
    HANDLE hFile = CreateFileW(
        fullPath.c_str(),
        GENERIC_READ,
        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
        NULL,
        OPEN_EXISTING,
        FILE_FLAG_SEQUENTIAL_SCAN,
        NULL
    );

    if (hFile == INVALID_HANDLE_VALUE) {
        return 0;
    }

    constexpr DWORD BUFFER_SIZE = 64 * 1024; // 64 KB chunk
    std::vector<uint8_t> buffer(BUFFER_SIZE);

    uint64_t hash = 14695981039346656037ULL; // 64-bit FNV-1a offset basis
    DWORD bytesRead = 0;

    while (ReadFile(hFile, buffer.data(), BUFFER_SIZE, &bytesRead, NULL) && bytesRead > 0) {
        for (DWORD i = 0; i < bytesRead; ++i) {
            hash ^= static_cast<uint64_t>(buffer[i]);
            hash *= 1099511628211ULL;
        }
    }

    CloseHandle(hFile);
    return hash;
}

} // namespace EchoSync

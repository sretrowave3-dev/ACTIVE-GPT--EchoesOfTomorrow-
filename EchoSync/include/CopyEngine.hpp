#pragma once

#include "Types.hpp"
#include <string>
#include <windows.h>
#include <vector>

namespace EchoSync {

class CopyEngine {
public:
    CopyEngine() = default;
    ~CopyEngine() = default;

    // Copies a single file using chunked streaming, timestamp preservation, and atomic swap
    bool CopyFileChunked(const std::wstring& srcPath, const std::wstring& destPath, uint64_t* outBytesTransferred = nullptr);

    // Moves/renames a file or directory on the passive target
    bool MoveFileOrDir(const std::wstring& oldDestPath, const std::wstring& newDestPath);

    // Deletes a file or recursively deletes a directory
    bool DeleteFileOrDir(const std::wstring& destPath);

    // Creates directory tree if missing
    bool EnsureDirectoryExists(const std::wstring& dirPath);

    // Syncs timestamp and attributes from source to destination file
    bool SyncFileMetadata(const std::wstring& srcPath, const std::wstring& destPath);

private:
    static constexpr DWORD CHUNK_SIZE = 64 * 1024; // 64 KB streaming chunk
};

} // namespace EchoSync

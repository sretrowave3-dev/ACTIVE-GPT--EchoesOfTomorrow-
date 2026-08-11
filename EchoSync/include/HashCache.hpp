#pragma once

#include "Types.hpp"
#include <string>
#include <unordered_map>
#include <mutex>

namespace EchoSync {

class HashCache {
public:
    HashCache() = default;
    ~HashCache() = default;

    // Computes 64-bit file hash. Uses cached value if timestamp and size match.
    uint64_t GetOrComputeHash(const std::wstring& fullPath, const FILETIME& lastWriteTime, uint64_t fileSize);

    void Invalidate(const std::wstring& fullPath);
    void Clear();

private:
    struct CachedHashEntry {
        FILETIME lastWriteTime;
        uint64_t fileSize;
        uint64_t contentHash;
    };

    uint64_t ComputeFileHash(const std::wstring& fullPath) const;

    mutable std::mutex m_mutex;
    std::unordered_map<uint64_t, CachedHashEntry> m_hashCache;
};

} // namespace EchoSync

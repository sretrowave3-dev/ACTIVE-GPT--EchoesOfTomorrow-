#pragma once

#include "Types.hpp"
#include <string>
#include <unordered_map>
#include <vector>
#include <mutex>
#include <optional>

namespace EchoSync {

class MetadataCache {
public:
    MetadataCache() = default;
    ~MetadataCache() = default;

    void Put(const FileMetadata& meta);
    std::optional<FileMetadata> Get(uint64_t pathHash) const;
    std::optional<FileMetadata> GetByPath(const std::wstring& relativePath) const;

    bool Remove(uint64_t pathHash);
    bool RemoveByPath(const std::wstring& relativePath);
    void RemoveSubtree(const std::wstring& relativeDirPath);

    void Clear();

    size_t Size() const;
    std::vector<FileMetadata> GetAllEntries() const;

private:
    mutable std::mutex m_mutex;
    std::unordered_map<uint64_t, FileMetadata> m_cache;
};

} // namespace EchoSync

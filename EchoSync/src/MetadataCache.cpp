#include "../include/MetadataCache.hpp"
#include <algorithm>

namespace EchoSync {

void MetadataCache::Put(const FileMetadata& meta) {
    std::lock_guard<std::mutex> lock(m_mutex);
    uint64_t hash = (meta.pathHash != 0) ? meta.pathHash : HashPath(meta.relativePath);
    FileMetadata m = meta;
    m.pathHash = hash;
    m_cache[hash] = m;
}

std::optional<FileMetadata> MetadataCache::Get(uint64_t pathHash) const {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_cache.find(pathHash);
    if (it != m_cache.end()) {
        return it->second;
    }
    return std::nullopt;
}

std::optional<FileMetadata> MetadataCache::GetByPath(const std::wstring& relativePath) const {
    uint64_t hash = HashPath(relativePath);
    return Get(hash);
}

bool MetadataCache::Remove(uint64_t pathHash) {
    std::lock_guard<std::mutex> lock(m_mutex);
    return m_cache.erase(pathHash) > 0;
}

bool MetadataCache::RemoveByPath(const std::wstring& relativePath) {
    uint64_t hash = HashPath(relativePath);
    return Remove(hash);
}

void MetadataCache::RemoveSubtree(const std::wstring& relativeDirPath) {
    std::lock_guard<std::mutex> lock(m_mutex);
    std::wstring prefix = relativeDirPath;
    if (!prefix.ends_with(L'\\') && !prefix.ends_with(L'/')) {
        prefix += L'\\';
    }

    for (auto it = m_cache.begin(); it != m_cache.end(); ) {
        if (it->second.relativePath.rfind(prefix, 0) == 0 || it->second.relativePath == relativeDirPath) {
            it = m_cache.erase(it);
        } else {
            ++it;
        }
    }
}

void MetadataCache::Clear() {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_cache.clear();
}

size_t MetadataCache::Size() const {
    std::lock_guard<std::mutex> lock(m_mutex);
    return m_cache.size();
}

std::vector<FileMetadata> MetadataCache::GetAllEntries() const {
    std::lock_guard<std::mutex> lock(m_mutex);
    std::vector<FileMetadata> result;
    result.reserve(m_cache.size());
    for (const auto& [hash, meta] : m_cache) {
        result.push_back(meta);
    }
    return result;
}

} // namespace EchoSync

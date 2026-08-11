#include "../include/PersistentCache.hpp"
#include "../include/Logger.hpp"
#include <fstream>
#include <vector>

namespace EchoSync {

#pragma pack(push, 1)
struct CacheFileHeader {
    char magic[4] = {'E', 'C', 'H', 'O'}; // "ECHO"
    uint32_t version = 1;
    uint64_t entryCount = 0;
};

struct RawCacheRecord {
    uint64_t pathHash;
    uint64_t fileSize;
    FILETIME lastWriteTime;
    uint32_t attributes;
    uint64_t contentHash;
    uint8_t isDirectory;
    uint32_t relPathLengthBytes;
};
#pragma pack(pop)

bool PersistentCache::Save(const std::string& cacheFilePath, const MetadataCache& cache) {
    std::ofstream outFile(cacheFilePath, std::ios::binary | std::ios::out);
    if (!outFile.is_open()) {
        Logger::Instance().Error("PersistentCache", "Failed to open " + cacheFilePath + " for writing.");
        return false;
    }

    auto entries = cache.GetAllEntries();
    CacheFileHeader header;
    header.entryCount = entries.size();

    outFile.write(reinterpret_cast<const char*>(&header), sizeof(header));

    for (const auto& meta : entries) {
        std::string relPathUtf8;
        if (!meta.relativePath.empty()) {
            int size = WideCharToMultiByte(CP_UTF8, 0, meta.relativePath.c_str(), static_cast<int>(meta.relativePath.size()), nullptr, 0, nullptr, nullptr);
            relPathUtf8.resize(size);
            WideCharToMultiByte(CP_UTF8, 0, meta.relativePath.c_str(), static_cast<int>(meta.relativePath.size()), &relPathUtf8[0], size, nullptr, nullptr);
        }

        RawCacheRecord record{
            .pathHash = meta.pathHash,
            .fileSize = meta.fileSize,
            .lastWriteTime = meta.lastWriteTime,
            .attributes = meta.attributes,
            .contentHash = meta.contentHash,
            .isDirectory = static_cast<uint8_t>(meta.isDirectory ? 1 : 0),
            .relPathLengthBytes = static_cast<uint32_t>(relPathUtf8.size())
        };

        outFile.write(reinterpret_cast<const char*>(&record), sizeof(record));
        if (record.relPathLengthBytes > 0) {
            outFile.write(relPathUtf8.data(), record.relPathLengthBytes);
        }
    }

    outFile.close();
    Logger::Instance().Info("PersistentCache", "Saved " + std::to_string(entries.size()) + " metadata entry(ies) to " + cacheFilePath);
    return true;
}

bool PersistentCache::Load(const std::string& cacheFilePath, MetadataCache& cache) {
    std::ifstream inFile(cacheFilePath, std::ios::binary | std::ios::in);
    if (!inFile.is_open()) {
        return false;
    }

    CacheFileHeader header;
    inFile.read(reinterpret_cast<char*>(&header), sizeof(header));
    if (header.magic[0] != 'E' || header.magic[1] != 'C' || header.magic[2] != 'H' || header.magic[3] != 'O') {
        Logger::Instance().Warning("PersistentCache", "Invalid magic header in " + cacheFilePath);
        return false;
    }

    cache.Clear();

    for (uint64_t i = 0; i < header.entryCount; ++i) {
        RawCacheRecord record;
        if (!inFile.read(reinterpret_cast<char*>(&record), sizeof(record))) break;

        std::string relPathUtf8(record.relPathLengthBytes, '\0');
        if (record.relPathLengthBytes > 0) {
            inFile.read(&relPathUtf8[0], record.relPathLengthBytes);
        }

        std::wstring relPathW;
        if (!relPathUtf8.empty()) {
            int size = MultiByteToWideChar(CP_UTF8, 0, relPathUtf8.c_str(), static_cast<int>(relPathUtf8.size()), nullptr, 0);
            relPathW.resize(size);
            MultiByteToWideChar(CP_UTF8, 0, relPathUtf8.c_str(), static_cast<int>(relPathUtf8.size()), &relPathW[0], size);
        }

        FileMetadata meta{
            .pathHash = record.pathHash,
            .relativePath = relPathW,
            .fileSize = record.fileSize,
            .lastWriteTime = record.lastWriteTime,
            .attributes = record.attributes,
            .contentHash = record.contentHash,
            .isDirectory = (record.isDirectory != 0)
        };

        cache.Put(meta);
    }

    inFile.close();
    Logger::Instance().Info("PersistentCache", "Loaded " + std::to_string(cache.Size()) + " metadata entry(ies) from " + cacheFilePath);
    return true;
}

} // namespace EchoSync

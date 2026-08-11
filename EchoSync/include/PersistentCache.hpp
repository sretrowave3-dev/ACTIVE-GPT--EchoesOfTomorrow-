#pragma once

#include "Types.hpp"
#include "MetadataCache.hpp"
#include <string>

namespace EchoSync {

class PersistentCache {
public:
    static bool Save(const std::string& cacheFilePath, const MetadataCache& cache);
    static bool Load(const std::string& cacheFilePath, MetadataCache& cache);
};

} // namespace EchoSync

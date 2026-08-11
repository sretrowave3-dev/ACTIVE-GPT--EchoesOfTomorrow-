#pragma once

#include "Types.hpp"
#include <string>
#include <vector>
#include <mutex>
#include <optional>

namespace EchoSync {

class ConfigManager {
public:
    ConfigManager() = default;
    ~ConfigManager() = default;

    bool Load(const std::string& configFilePath = "EchoSync.json");
    bool Save(const std::string& configFilePath = "EchoSync.json");

    void AddPair(const SyncPairConfig& pair);
    bool RemovePair(const std::string& pairId);
    std::vector<SyncPairConfig> GetPairs() const;
    std::optional<SyncPairConfig> GetPair(const std::string& pairId) const;

    void SetPairEnabled(const std::string& pairId, bool enabled);
    void UpdatePairPolicy(const std::string& pairId, SyncPolicy policy);

    std::string GetConfigPath() const { return m_configPath; }

private:
    std::string EscapedJsonString(const std::string& str) const;
    std::wstring EscapedJsonWString(const std::wstring& str) const;

    mutable std::mutex m_mutex;
    std::string m_configPath = "EchoSync.json";
    std::vector<SyncPairConfig> m_pairs;
};

} // namespace EchoSync

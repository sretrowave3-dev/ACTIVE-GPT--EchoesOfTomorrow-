#include "../include/ConfigManager.hpp"
#include "../include/Logger.hpp"
#include <fstream>
#include <sstream>
#include <iostream>
#include <algorithm>

namespace EchoSync {

bool ConfigManager::Load(const std::string& configFilePath) {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_configPath = configFilePath;

    std::ifstream file(configFilePath);
    if (!file.is_open()) {
        Logger::Instance().Info("Config", "Config file " + configFilePath + " not found. Creating default configuration.");
        
        m_pairs.clear();

        // Add a default sample pair if missing
        SyncPairConfig defaultPair{
            .id = "Pair_01",
            .activePath = L"C:\\EchoSync_Active",
            .passivePath = L"C:\\EchoSync_Passive",
            .policy = SyncPolicy::Mirror,
            .filters = FilterConfig{},
            .enabled = true,
            .recursive = true
        };
        m_pairs.push_back(defaultPair);

        // Release mutex before Save to prevent deadlock
        // Save() acquires m_mutex
        // Instead of calling Save inside lock, write inline or unlock
        file.close();
        
        // Create default config file manually
        std::ofstream outFile(configFilePath);
        if (outFile.is_open()) {
            outFile << "{\n";
            outFile << "  \"pairs\": [\n";
            outFile << "    {\n";
            outFile << "      \"id\": \"Pair_01\",\n";
            outFile << "      \"activePath\": \"C:\\\\EchoSync_Active\",\n";
            outFile << "      \"passivePath\": \"C:\\\\EchoSync_Passive\",\n";
            outFile << "      \"policy\": \"Mirror\",\n";
            outFile << "      \"enabled\": true,\n";
            outFile << "      \"recursive\": true,\n";
            outFile << "      \"excludeDirectories\": [\".git\", \"node_modules\", \"build\", \"bin\", \"obj\", \"temp\", \"cache\"],\n";
            outFile << "      \"excludeExtensions\": [\".tmp\", \".bak\", \".log\"]\n";
            outFile << "    }\n";
            outFile << "  ]\n";
            outFile << "}\n";
            outFile.close();
        }
        return true;
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string jsonStr = buffer.str();
    file.close();

    // Fast lightweight JSON parser for EchoSync.json
    m_pairs.clear();

    size_t pairPos = 0;
    while ((pairPos = jsonStr.find("\"id\":", pairPos)) != std::string::npos) {
        size_t blockStart = jsonStr.rfind('{', pairPos);
        size_t blockEnd = jsonStr.find('}', pairPos);
        if (blockStart == std::string::npos || blockEnd == std::string::npos) break;

        std::string block = jsonStr.substr(blockStart, blockEnd - blockStart + 1);

        auto ExtractVal = [](const std::string& jsonBlock, const std::string& key) -> std::string {
            size_t kpos = jsonBlock.find("\"" + key + "\":");
            if (kpos == std::string::npos) return "";
            size_t valStart = jsonBlock.find(':', kpos) + 1;
            while (valStart < jsonBlock.size() && (jsonBlock[valStart] == ' ' || jsonBlock[valStart] == '\t')) valStart++;

            if (valStart < jsonBlock.size() && jsonBlock[valStart] == '"') {
                size_t strEnd = jsonBlock.find('"', valStart + 1);
                return jsonBlock.substr(valStart + 1, strEnd - valStart - 1);
            } else {
                size_t valEnd = jsonBlock.find_first_of(",}\n\r", valStart);
                std::string raw = jsonBlock.substr(valStart, valEnd - valStart);
                raw.erase(std::remove_if(raw.begin(), raw.end(), ::isspace), raw.end());
                return raw;
            }
        };

        auto ExtractArray = [](const std::string& jsonBlock, const std::string& key) -> std::vector<std::string> {
            std::vector<std::string> res;
            size_t kpos = jsonBlock.find("\"" + key + "\":");
            if (kpos == std::string::npos) return res;
            size_t arrStart = jsonBlock.find('[', kpos);
            size_t arrEnd = jsonBlock.find(']', kpos);
            if (arrStart == std::string::npos || arrEnd == std::string::npos) return res;

            std::string arrStr = jsonBlock.substr(arrStart + 1, arrEnd - arrStart - 1);
            size_t spos = 0;
            while ((spos = arrStr.find('"', spos)) != std::string::npos) {
                size_t epos = arrStr.find('"', spos + 1);
                if (epos == std::string::npos) break;
                res.push_back(arrStr.substr(spos + 1, epos - spos - 1));
                spos = epos + 1;
            }
            return res;
        };

        SyncPairConfig pair;
        pair.id = ExtractVal(block, "id");
        if (pair.id.empty()) pair.id = "Pair_" + std::to_string(m_pairs.size() + 1);

        std::string active = ExtractVal(block, "activePath");
        std::string passive = ExtractVal(block, "passivePath");
        pair.activePath = StringToWString(active);
        pair.passivePath = StringToWString(passive);

        std::string pol = ExtractVal(block, "policy");
        pair.policy = StringToPolicy(pol);

        std::string en = ExtractVal(block, "enabled");
        pair.enabled = (en != "false");

        std::string rec = ExtractVal(block, "recursive");
        pair.recursive = (rec != "false");

        pair.filters.excludeDirectories = ExtractArray(block, "excludeDirectories");
        if (pair.filters.excludeDirectories.empty()) {
            pair.filters.excludeDirectories = {".git", "node_modules", "build", "bin", "obj", "temp", "cache"};
        }
        pair.filters.excludeExtensions = ExtractArray(block, "excludeExtensions");
        if (pair.filters.excludeExtensions.empty()) {
            pair.filters.excludeExtensions = {".tmp", ".bak", ".log"};
        }
        pair.filters.includeExtensions = ExtractArray(block, "includeExtensions");

        std::string profileStr = ExtractVal(block, "profile");
        if (!profileStr.empty()) {
            pair.filters.profile = StringToProfile(profileStr);
        } else {
            pair.filters.profile = ProjectProfile::Custom;
        }

        std::string syncModeStr = ExtractVal(block, "syncMode");
        if (!syncModeStr.empty()) {
            pair.filters.syncMode = StringToSyncMode(syncModeStr);
        } else {
            pair.filters.syncMode = SyncMode::Development;
        }

        std::vector<std::string> protPaths = ExtractArray(block, "protectedPaths");
        if (!protPaths.empty()) {
            pair.filters.protectedPaths = protPaths;
        } else {
            pair.filters.protectedPaths = {"build", "plugins", "mods", "backups"};
        }

        pair.filters.customUserRules = ExtractArray(block, "customUserRules");


        m_pairs.push_back(pair);
        pairPos = blockEnd + 1;
    }

    Logger::Instance().Info("Config", "Successfully loaded " + std::to_string(m_pairs.size()) + " sync pair(s).");
    return true;
}

bool ConfigManager::Save(const std::string& configFilePath) {
    std::lock_guard<std::mutex> lock(m_mutex);
    std::string path = configFilePath.empty() ? m_configPath : configFilePath;

    std::ofstream outFile(path);
    if (!outFile.is_open()) {
        Logger::Instance().Error("Config", "Failed to open " + path + " for writing.");
        return false;
    }

    outFile << "{\n";
    outFile << "  \"pairs\": [\n";
    for (size_t i = 0; i < m_pairs.size(); ++i) {
        const auto& p = m_pairs[i];
        outFile << "    {\n";
        outFile << "      \"id\": \"" << p.id << "\",\n";
        outFile << "      \"activePath\": \"" << EscapedJsonString(WStringToString(p.activePath)) << "\",\n";
        outFile << "      \"passivePath\": \"" << EscapedJsonString(WStringToString(p.passivePath)) << "\",\n";
        outFile << "      \"policy\": \"" << PolicyToString(p.policy) << "\",\n";
        outFile << "      \"enabled\": " << (p.enabled ? "true" : "false") << ",\n";
        outFile << "      \"recursive\": " << (p.recursive ? "true" : "false") << ",\n";

        // Exclude directories array
        outFile << "      \"excludeDirectories\": [";
        for (size_t d = 0; d < p.filters.excludeDirectories.size(); ++d) {
            outFile << "\"" << p.filters.excludeDirectories[d] << "\"";
            if (d + 1 < p.filters.excludeDirectories.size()) outFile << ", ";
        }
        outFile << "],\n";

        // Exclude extensions array
        outFile << "      \"excludeExtensions\": [";
        for (size_t e = 0; e < p.filters.excludeExtensions.size(); ++e) {
            outFile << "\"" << p.filters.excludeExtensions[e] << "\"";
            if (e + 1 < p.filters.excludeExtensions.size()) outFile << ", ";
        }
        outFile << "],\n";

        // Include extensions array
        outFile << "      \"includeExtensions\": [";
        for (size_t ie = 0; ie < p.filters.includeExtensions.size(); ++ie) {
            outFile << "\"" << p.filters.includeExtensions[ie] << "\"";
            if (ie + 1 < p.filters.includeExtensions.size()) outFile << ", ";
        }
        outFile << "],\n";

        // Profile
        outFile << "      \"profile\": \"" << ProfileToString(p.filters.profile) << "\",\n";

        // Sync Mode
        outFile << "      \"syncMode\": \"" << SyncModeToString(p.filters.syncMode) << "\",\n";

        // Protected Paths array
        outFile << "      \"protectedPaths\": [";
        for (size_t pr = 0; pr < p.filters.protectedPaths.size(); ++pr) {
            outFile << "\"" << p.filters.protectedPaths[pr] << "\"";
            if (pr + 1 < p.filters.protectedPaths.size()) outFile << ", ";
        }
        outFile << "],\n";

        // Custom User Rules array
        outFile << "      \"customUserRules\": [";
        for (size_t cu = 0; cu < p.filters.customUserRules.size(); ++cu) {
            outFile << "\"" << p.filters.customUserRules[cu] << "\"";
            if (cu + 1 < p.filters.customUserRules.size()) outFile << ", ";
        }
        outFile << "]\n";

        outFile << "    }" << (i + 1 < m_pairs.size() ? "," : "") << "\n";
    }
    outFile << "  ]\n";
    outFile << "}\n";
    outFile.close();

    Logger::Instance().Info("Config", "Configuration saved to " + path);
    return true;
}

void ConfigManager::AddPair(const SyncPairConfig& pair) {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_pairs.push_back(pair);
}

bool ConfigManager::RemovePair(const std::string& pairId) {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = std::remove_if(m_pairs.begin(), m_pairs.end(), [&](const SyncPairConfig& p) {
        return p.id == pairId;
    });
    if (it != m_pairs.end()) {
        m_pairs.erase(it, m_pairs.end());
        return true;
    }
    return false;
}

std::vector<SyncPairConfig> ConfigManager::GetPairs() const {
    std::lock_guard<std::mutex> lock(m_mutex);
    return m_pairs;
}

std::optional<SyncPairConfig> ConfigManager::GetPair(const std::string& pairId) const {
    std::lock_guard<std::mutex> lock(m_mutex);
    for (const auto& p : m_pairs) {
        if (p.id == pairId) return p;
    }
    return std::nullopt;
}

void ConfigManager::SetPairEnabled(const std::string& pairId, bool enabled) {
    std::lock_guard<std::mutex> lock(m_mutex);
    for (auto& p : m_pairs) {
        if (p.id == pairId) {
            p.enabled = enabled;
            break;
        }
    }
}

void ConfigManager::UpdatePairPolicy(const std::string& pairId, SyncPolicy policy) {
    std::lock_guard<std::mutex> lock(m_mutex);
    for (auto& p : m_pairs) {
        if (p.id == pairId) {
            p.policy = policy;
            break;
        }
    }
}

std::string ConfigManager::EscapedJsonString(const std::string& str) const {
    std::string res;
    for (char c : str) {
        if (c == '\\') res += "\\\\";
        else if (c == '"') res += "\\\"";
        else res += c;
    }
    return res;
}

std::wstring ConfigManager::EscapedJsonWString(const std::wstring& str) const {
    std::wstring res;
    for (wchar_t c : str) {
        if (c == L'\\') res += L"\\\\";
        else if (c == L'"') res += L"\\\"";
        else res += c;
    }
    return res;
}

} // namespace EchoSync

#pragma once

#include <string>
#include <vector>
#include <cstdint>
#include <chrono>
#include <filesystem>
#include <optional>
#include <windows.h>

namespace EchoSync {

enum class SyncPolicy {
    Mirror,          // Active -> Passive (Strict Mirror, removes non-existing items from Passive)
    OneWay,          // Active -> Passive (Copy/Modify, keep extra Passive items)
    TwoWay,          // Active <-> Passive (Bidirectional, newest timestamp wins)
    ReplaceExisting, // Active -> Passive (Only update existing files in Passive)
    BackupOnly,      // Active -> Passive (Append timestamp to modified files)
    Manual           // Collect events only, require explicit manual trigger
};

enum class FileAction {
    Create,
    Modify,
    Delete,
    Rename,
    Move,
    Replace
};

enum class SyncStatus {
    Idle,
    Running,
    Paused,
    Syncing,
    Error
};

enum class ProjectProfile {
    GenericCpp,
    CMake,
    VisualStudio,
    UnrealEngine,
    Unity,
    Godot,
    NodeJS,
    Custom
};

enum class SyncMode {
    Development,       // Development Sync (everything except Temp, Cache, Generated)
    SourceOnly,        // Source Only (Source + Header)
    AssetsOnly,        // Assets Only (Assets)
    Release,           // Release Sync (Executable, Binary, Documentation, Configuration)
    ConfigurationOnly, // Configuration Only (Configuration)
    DocumentationOnly, // Documentation Only (Documentation)
    Custom             // Custom (rely purely on standard filter patterns)
};

enum class FileCategory {
    Source,
    Header,
    Assets,
    Configuration,
    Generated,
    Temporary,
    Cache,
    Documentation,
    Executable,
    Binary,
    Unknown
};

struct FilterConfig {
    std::vector<std::string> excludeDirectories = {
        ".git", "node_modules", "build", "bin", "obj", "temp", "cache", ".vs"
    };
    std::vector<std::string> excludeExtensions = {
        ".tmp", ".bak", ".log", ".crswap"
    };
    std::vector<std::string> includeExtensions; // Empty = include all
    
    ProjectProfile profile = ProjectProfile::Custom;
    SyncMode syncMode = SyncMode::Development;
    std::vector<std::string> protectedPaths = {"build", "plugins", "mods", "backups"};
    std::vector<std::string> customUserRules;
};

struct PendingConfirmation {
    std::string id;
    std::string pairId;
    FileAction action;
    std::wstring activeRelPath;
    std::wstring oldActiveRelPath; // For renames
    bool isDirectory = false;
    std::chrono::system_clock::time_point timestamp = std::chrono::system_clock::now();
};


struct SyncPairConfig {
    std::string id;
    std::wstring activePath;
    std::wstring passivePath;
    SyncPolicy policy = SyncPolicy::Mirror;
    FilterConfig filters;
    bool enabled = true;
    bool recursive = true;
};

struct FileMetadata {
    uint64_t pathHash = 0;
    std::wstring relativePath;
    uint64_t fileSize = 0;
    FILETIME lastWriteTime = {0, 0};
    uint32_t attributes = 0;
    uint64_t contentHash = 0;
    bool isDirectory = false;
};

struct FileSystemEvent {
    std::string pairId;
    FileAction action;
    std::wstring activeRelPath;
    std::wstring oldActiveRelPath; // For renames/moves
    std::chrono::system_clock::time_point timestamp;
    bool isDirectory = false;
    uint64_t fileSize = 0;
};

struct SyncStats {
    uint64_t totalEventsDetected = 0;
    uint64_t totalEventsCoalesced = 0;
    uint64_t totalFilesCopied = 0;
    uint64_t totalFilesDeleted = 0;
    uint64_t totalFilesRenamed = 0;
    uint64_t totalBytesTransferred = 0;
    uint64_t totalSyncDurationMs = 0;
    uint64_t errorCount = 0;
    std::chrono::system_clock::time_point startTime = std::chrono::system_clock::now();
};

inline std::string PolicyToString(SyncPolicy policy) {
    switch (policy) {
        case SyncPolicy::Mirror: return "Mirror";
        case SyncPolicy::OneWay: return "One-Way";
        case SyncPolicy::TwoWay: return "Two-Way";
        case SyncPolicy::ReplaceExisting: return "Replace Existing";
        case SyncPolicy::BackupOnly: return "Backup Only";
        case SyncPolicy::Manual: return "Manual";
    }
    return "Unknown";
}

inline SyncPolicy StringToPolicy(const std::string& str) {
    if (str == "OneWay" || str == "One-Way") return SyncPolicy::OneWay;
    if (str == "TwoWay" || str == "Two-Way") return SyncPolicy::TwoWay;
    if (str == "ReplaceExisting") return SyncPolicy::ReplaceExisting;
    if (str == "BackupOnly") return SyncPolicy::BackupOnly;
    if (str == "Manual") return SyncPolicy::Manual;
    return SyncPolicy::Mirror;
}

inline std::string ActionToString(FileAction action) {
    switch (action) {
        case FileAction::Create: return "CREATE";
        case FileAction::Modify: return "MODIFY";
        case FileAction::Delete: return "DELETE";
        case FileAction::Rename: return "RENAME";
        case FileAction::Move:   return "MOVE";
        case FileAction::Replace: return "REPLACE";
    }
    return "UNKNOWN";
}

inline std::string ProfileToString(ProjectProfile profile) {
    switch (profile) {
        case ProjectProfile::GenericCpp: return "GenericCpp";
        case ProjectProfile::CMake: return "CMake";
        case ProjectProfile::VisualStudio: return "VisualStudio";
        case ProjectProfile::UnrealEngine: return "UnrealEngine";
        case ProjectProfile::Unity: return "Unity";
        case ProjectProfile::Godot: return "Godot";
        case ProjectProfile::NodeJS: return "NodeJS";
        case ProjectProfile::Custom: return "Custom";
    }
    return "Custom";
}

inline ProjectProfile StringToProfile(const std::string& str) {
    if (str == "GenericCpp") return ProjectProfile::GenericCpp;
    if (str == "CMake") return ProjectProfile::CMake;
    if (str == "VisualStudio") return ProjectProfile::VisualStudio;
    if (str == "UnrealEngine") return ProjectProfile::UnrealEngine;
    if (str == "Unity") return ProjectProfile::Unity;
    if (str == "Godot") return ProjectProfile::Godot;
    if (str == "NodeJS") return ProjectProfile::NodeJS;
    return ProjectProfile::Custom;
}

inline std::string SyncModeToString(SyncMode mode) {
    switch (mode) {
        case SyncMode::Development: return "Development";
        case SyncMode::SourceOnly: return "SourceOnly";
        case SyncMode::AssetsOnly: return "AssetsOnly";
        case SyncMode::Release: return "Release";
        case SyncMode::ConfigurationOnly: return "ConfigurationOnly";
        case SyncMode::DocumentationOnly: return "DocumentationOnly";
        case SyncMode::Custom: return "Custom";
    }
    return "Custom";
}

inline SyncMode StringToSyncMode(const std::string& str) {
    if (str == "Development") return SyncMode::Development;
    if (str == "SourceOnly") return SyncMode::SourceOnly;
    if (str == "AssetsOnly") return SyncMode::AssetsOnly;
    if (str == "Release") return SyncMode::Release;
    if (str == "ConfigurationOnly") return SyncMode::ConfigurationOnly;
    if (str == "DocumentationOnly") return SyncMode::DocumentationOnly;
    return SyncMode::Custom;
}

inline std::string CategoryToString(FileCategory cat) {
    switch (cat) {
        case FileCategory::Source: return "Source";
        case FileCategory::Header: return "Header";
        case FileCategory::Assets: return "Assets";
        case FileCategory::Configuration: return "Configuration";
        case FileCategory::Generated: return "Generated";
        case FileCategory::Temporary: return "Temporary";
        case FileCategory::Cache: return "Cache";
        case FileCategory::Documentation: return "Documentation";
        case FileCategory::Executable: return "Executable";
        case FileCategory::Binary: return "Binary";
        case FileCategory::Unknown: return "Unknown";
    }
    return "Unknown";
}


// Simple fast 64-bit FNV-1a hash for paths
inline uint64_t HashPath(const std::wstring& path) {
    uint64_t hash = 14695981039346656037ULL;
    for (wchar_t ch : path) {
        wchar_t lowerCh = (ch >= L'A' && ch <= L'Z') ? static_cast<wchar_t>(ch + 32) : ch;
        if (lowerCh == L'/') lowerCh = L'\\'; // Normalize separator
        hash ^= static_cast<uint64_t>(lowerCh);
        hash *= 1099511628211ULL;
    }
    return hash;
}

inline std::string WStringToString(const std::wstring& wstr) {
    if (wstr.empty()) return "";
    int size = WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), static_cast<int>(wstr.size()), nullptr, 0, nullptr, nullptr);
    std::string str(size, 0);
    WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), static_cast<int>(wstr.size()), &str[0], size, nullptr, nullptr);
    return str;
}

inline std::wstring StringToWString(const std::string& str) {
    if (str.empty()) return L"";
    int size = MultiByteToWideChar(CP_UTF8, 0, str.c_str(), static_cast<int>(str.size()), nullptr, 0);
    std::wstring wstr(size, 0);
    MultiByteToWideChar(CP_UTF8, 0, str.c_str(), static_cast<int>(str.size()), &wstr[0], size);
    return wstr;
}

} // namespace EchoSync

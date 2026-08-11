#include "../include/PathFilter.hpp"
#include <algorithm>

namespace EchoSync {

static std::string WStringToLowerUtf8(const std::wstring& wstr) {
    std::string str = WStringToString(wstr);
    std::transform(str.begin(), str.end(), str.begin(), [](unsigned char c) {
        return static_cast<char>(std::tolower(c));
    });
    return str;
}

static FileCategory CategorizeFile(const std::string& pathUtf8, ProjectProfile profile) {
    size_t dotPos = pathUtf8.rfind('.');
    std::string ext = (dotPos != std::string::npos) ? pathUtf8.substr(dotPos) : "";
    
    size_t slashPos = pathUtf8.find_last_of('/');
    std::string filename = (slashPos != std::string::npos) ? pathUtf8.substr(slashPos + 1) : pathUtf8;

    // Profile-specific rules first
    if (profile == ProjectProfile::CMake) {
        if (filename == "cmakelists.txt" || ext == ".cmake") {
            return FileCategory::Configuration;
        }
        if (filename == "cmakecache.txt" || pathUtf8.find("/cmakefiles/") != std::string::npos || filename == "makefile" || filename == "cmake_install.cmake") {
            return FileCategory::Generated;
        }
    } else if (profile == ProjectProfile::VisualStudio) {
        if (ext == ".sln" || ext == ".vcxproj" || ext == ".filters" || ext == ".user") {
            return FileCategory::Configuration;
        }
        if (pathUtf8.find("/.vs/") != std::string::npos || pathUtf8.starts_with(".vs/") || ext == ".suo" || ext == ".opensdf" || ext == ".sdf" || ext == ".db" || ext == ".ipch") {
            return FileCategory::Temporary;
        }
    } else if (profile == ProjectProfile::UnrealEngine) {
        if (ext == ".uproject" || pathUtf8.find("/config/") != std::string::npos || pathUtf8.starts_with("config/")) {
            return FileCategory::Configuration;
        }
        if (ext == ".uasset" || ext == ".umap") {
            return FileCategory::Assets;
        }
        if (pathUtf8.find("/intermediate/") != std::string::npos || pathUtf8.starts_with("intermediate/") ||
            pathUtf8.find("/saved/") != std::string::npos || pathUtf8.starts_with("saved/") ||
            pathUtf8.find("/deriveddatacache/") != std::string::npos || pathUtf8.starts_with("deriveddatacache/") ||
            pathUtf8.find("/binaries/") != std::string::npos || pathUtf8.starts_with("binaries/")) {
            return FileCategory::Temporary;
        }
    } else if (profile == ProjectProfile::Unity) {
        if (pathUtf8.find("/projectsettings/") != std::string::npos || pathUtf8.starts_with("projectsettings/")) {
            return FileCategory::Configuration;
        }
        if (ext == ".meta" || ext == ".unity" || ext == ".prefab" || ext == ".asset" || ext == ".mat" || ext == ".fbx") {
            return FileCategory::Assets;
        }
        if (pathUtf8.find("/library/") != std::string::npos || pathUtf8.starts_with("library/") ||
            pathUtf8.find("/temp/") != std::string::npos || pathUtf8.starts_with("temp/") ||
            pathUtf8.find("/logs/") != std::string::npos || pathUtf8.starts_with("logs/") ||
            pathUtf8.find("/obj/") != std::string::npos || pathUtf8.starts_with("obj/") ||
            pathUtf8.find("/build/") != std::string::npos || pathUtf8.starts_with("build/")) {
            return FileCategory::Temporary;
        }
    } else if (profile == ProjectProfile::Godot) {
        if (filename == "project.godot" || filename == ".gdignore") {
            return FileCategory::Configuration;
        }
        if (ext == ".tscn" || ext == ".tres" || ext == ".gdshader") {
            return FileCategory::Assets;
        }
        if (ext == ".gd" || ext == ".cs") {
            return FileCategory::Source;
        }
        if (pathUtf8.find("/.godot/") != std::string::npos || pathUtf8.starts_with(".godot/") ||
            pathUtf8.find("/.import/") != std::string::npos || pathUtf8.starts_with(".import/")) {
            return FileCategory::Temporary;
        }
    } else if (profile == ProjectProfile::NodeJS) {
        if (filename == "package.json" || filename == "package-lock.json" || filename == "tsconfig.json") {
            return FileCategory::Configuration;
        }
        if (ext == ".js" || ext == ".ts" || ext == ".mjs" || ext == ".cjs") {
            return FileCategory::Source;
        }
        if (pathUtf8.find("/node_modules/") != std::string::npos || pathUtf8.starts_with("node_modules/") ||
            filename == "npm-debug.log") {
            return FileCategory::Temporary;
        }
    }

    // Generic extension-based rules
    if (ext == ".h" || ext == ".hpp" || ext == ".hxx" || ext == ".inl") {
        return FileCategory::Header;
    }
    if (ext == ".cpp" || ext == ".c" || ext == ".cc" || ext == ".cxx" || ext == ".ixx") {
        return FileCategory::Source;
    }
    if (ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".gif" || ext == ".bmp" || ext == ".tga" || ext == ".ico" ||
        ext == ".wav" || ext == ".mp3" || ext == ".ogg" || ext == ".flac" || ext == ".ttf" || ext == ".otf" || ext == ".woff" || ext == ".woff2") {
        return FileCategory::Assets;
    }
    if (ext == ".json" || ext == ".xml" || ext == ".yaml" || ext == ".yml" || ext == ".ini" || ext == ".conf" || ext == ".cfg" || ext == ".toml" || ext == ".properties") {
        return FileCategory::Configuration;
    }
    if (ext == ".tmp" || ext == ".bak" || ext == ".log" || ext == ".crswap" || ext == ".swp" || filename.ends_with("~")) {
        return FileCategory::Temporary;
    }
    if (ext == ".cache" || ext == ".db" || ext == ".pdb" || ext == ".ilk" || ext == ".idb" || ext == ".pch" || ext == ".ipch") {
        return FileCategory::Cache;
    }
    if (ext == ".md" || ext == ".txt" || ext == ".pdf" || ext == ".html" || ext == ".htm" || ext == ".rst" || ext == ".docx" || ext == ".xlsx") {
        return FileCategory::Documentation;
    }
    if (ext == ".exe" || ext == ".dll" || ext == ".bat" || ext == ".cmd" || ext == ".sh" || ext == ".ps1") {
        return FileCategory::Executable;
    }
    if (ext == ".o" || ext == ".obj" || ext == ".a" || ext == ".lib" || ext == ".so" || ext == ".dylib" || ext == ".bin" || ext == ".out") {
        return FileCategory::Binary;
    }

    return FileCategory::Unknown;
}

bool PathFilter::ShouldInclude(const std::wstring& relativePath, bool isDirectory) const {
    if (relativePath.empty()) return true;

    std::string pathUtf8 = WStringToLowerUtf8(relativePath);

    // Normalize separators to /
    std::replace(pathUtf8.begin(), pathUtf8.end(), '\\', '/');

    // 0. Evaluate customUserRules if present (allows users to override default rules)
    for (const auto& rule : m_config.customUserRules) {
        if (rule.empty()) continue;
        bool isInclude = rule[0] == '+';
        bool isExclude = rule[0] == '-';
        std::string pattern = (isInclude || isExclude) ? rule.substr(1) : rule;
        
        std::transform(pattern.begin(), pattern.end(), pattern.begin(), [](unsigned char c) {
            return static_cast<char>(std::tolower(c));
        });
        std::replace(pattern.begin(), pattern.end(), '\\', '/');

        if (pathUtf8.find(pattern) != std::string::npos) {
            if (isExclude) return false;
            if (isInclude) return true;
        }
    }

    // 1. Check directory exclusions
    for (const auto& dir : m_config.excludeDirectories) {
        if (dir.empty()) continue;
        std::string lowerDir = dir;
        std::transform(lowerDir.begin(), lowerDir.end(), lowerDir.begin(), [](unsigned char c) {
            return static_cast<char>(std::tolower(c));
        });

        std::string target1 = "/" + lowerDir + "/";
        std::string target2 = lowerDir + "/";
        
        if (pathUtf8.find(target1) != std::string::npos ||
            pathUtf8.rfind(target2, 0) == 0 ||
            (isDirectory && (pathUtf8 == lowerDir || pathUtf8.ends_with("/" + lowerDir)))) {
            return false;
        }
    }

    // 1b. Check protected paths (protect from synchronization, modification, or deletion)
    for (const auto& prot : m_config.protectedPaths) {
        if (prot.empty()) continue;
        std::string lowerProt = prot;
        std::transform(lowerProt.begin(), lowerProt.end(), lowerProt.begin(), [](unsigned char c) {
            return static_cast<char>(std::tolower(c));
        });
        std::replace(lowerProt.begin(), lowerProt.end(), '\\', '/');

        std::string target1 = "/" + lowerProt + "/";
        std::string target2 = lowerProt + "/";

        if (pathUtf8.find(target1) != std::string::npos ||
            pathUtf8.rfind(target2, 0) == 0 ||
            pathUtf8 == lowerProt ||
            pathUtf8.ends_with("/" + lowerProt)) {
            return false;
        }
    }

    if (isDirectory) {
        return true; // Directory passes exclude/protect checks
    }

    size_t dotPos = pathUtf8.rfind('.');
    std::string ext = (dotPos != std::string::npos) ? pathUtf8.substr(dotPos) : "";

    // 2. Check exclude extensions
    for (const auto& exExt : m_config.excludeExtensions) {
        if (exExt.empty()) continue;
        std::string lowerExExt = exExt;
        if (!lowerExExt.starts_with('.')) lowerExExt = "." + lowerExExt;
        std::transform(lowerExExt.begin(), lowerExExt.end(), lowerExExt.begin(), [](unsigned char c) {
            return static_cast<char>(std::tolower(c));
        });

        if (ext == lowerExExt) {
            return false;
        }
    }

    // 3. Check include extensions if non-empty
    if (!m_config.includeExtensions.empty()) {
        bool matchFound = false;
        for (const auto& incExt : m_config.includeExtensions) {
            if (incExt.empty()) continue;
            std::string lowerIncExt = incExt;
            if (!lowerIncExt.starts_with('.')) lowerIncExt = "." + lowerIncExt;
            std::transform(lowerIncExt.begin(), lowerIncExt.end(), lowerIncExt.begin(), [](unsigned char c) {
                return static_cast<char>(std::tolower(c));
            });

            if (ext == lowerIncExt) {
                matchFound = true;
                break;
            }
        }
        if (!matchFound) return false;
    }

    // 4. Apply SyncMode and FileCategory logic
    if (m_config.syncMode != SyncMode::Custom) {
        FileCategory cat = CategorizeFile(pathUtf8, m_config.profile);
        switch (m_config.syncMode) {
            case SyncMode::Development:
                if (cat == FileCategory::Temporary || cat == FileCategory::Cache || cat == FileCategory::Generated) {
                    return false;
                }
                break;
            case SyncMode::SourceOnly:
                if (cat != FileCategory::Source && cat != FileCategory::Header) {
                    return false;
                }
                break;
            case SyncMode::AssetsOnly:
                if (cat != FileCategory::Assets) {
                    return false;
                }
                break;
            case SyncMode::Release:
                if (cat != FileCategory::Executable && cat != FileCategory::Binary && 
                    cat != FileCategory::Documentation && cat != FileCategory::Configuration) {
                    return false;
                }
                break;
            case SyncMode::ConfigurationOnly:
                if (cat != FileCategory::Configuration) {
                    return false;
                }
                break;
            case SyncMode::DocumentationOnly:
                if (cat != FileCategory::Documentation) {
                    return false;
                }
                break;
            default:
                break;
        }
    }

    return true;
}

} // namespace EchoSync


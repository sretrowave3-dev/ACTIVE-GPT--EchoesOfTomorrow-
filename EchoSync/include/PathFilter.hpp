#pragma once

#include "Types.hpp"
#include <string>
#include <vector>

namespace EchoSync {

class PathFilter {
public:
    PathFilter() = default;
    explicit PathFilter(const FilterConfig& config) : m_config(config) {}

    void SetConfig(const FilterConfig& config) { m_config = config; }
    FilterConfig GetConfig() const { return m_config; }

    // Evaluates relative path string
    bool ShouldInclude(const std::wstring& relativePath, bool isDirectory) const;

private:
    FilterConfig m_config;
};

} // namespace EchoSync

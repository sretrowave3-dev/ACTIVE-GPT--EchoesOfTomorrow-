#pragma once

#include "Types.hpp"
#include "ConfigManager.hpp"
#include "SyncEngine.hpp"
#include "MetadataCache.hpp"
#include <atomic>
#include <thread>
#include <string>

namespace EchoSync {

class AppController; // Forward declaration

class ConsoleInterface {
public:
    explicit ConsoleInterface(AppController& controller);
    ~ConsoleInterface() = default;

    void RunInteractiveMenu();
    void PrintDashboard();
    void HandleMenuChoice(int choice);

    void ShowMenuOnce();

private:
    void OptionAddPair();
    void OptionRemovePair();
    void OptionPauseSync();
    void OptionResumeSync();
    void OptionManualScan();
    void OptionForceFullSync();
    void OptionShowStatistics();
    void OptionShowLogs();
    void OptionShowSettings();

    AppController& m_controller;
    std::atomic<bool> m_inInteractiveMode{false};
};

} // namespace EchoSync

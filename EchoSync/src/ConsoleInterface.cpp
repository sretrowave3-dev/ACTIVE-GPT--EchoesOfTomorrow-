#include "../include/ConsoleInterface.hpp"
#include "../include/AppController.hpp"
#include "../include/Logger.hpp"
#include <iostream>
#include <iomanip>
#include <limits>
#include <thread>
#include <conio.h>

namespace EchoSync {

ConsoleInterface::ConsoleInterface(AppController& controller)
    : m_controller(controller) {}

void ConsoleInterface::PrintDashboard() {
    auto pairs = m_controller.GetConfigManager().GetPairs();
    auto stats = m_controller.GetSyncEngine().GetStats();
    bool isPaused = m_controller.GetSyncEngine().IsPaused();

    std::cout << "\n===========================================================================\n";
    std::cout << "                               EchoSync v1.0                               \n";
    std::cout << "          High-Performance Event-Driven Sync Engine (C++23)               \n";
    std::cout << "===========================================================================\n";
    std::cout << " [Status]: " << (isPaused ? "PAUSED" : "RUNNING")
              << " | Active Pairs: " << pairs.size()
              << " | Watcher State: ASLEEP (0.0% CPU)\n";
    std::cout << " Cache Size: " << m_controller.GetMetadataCache().Size() << " items"
              << " | Events Processed: " << stats.totalEventsDetected
              << " | Errors: " << stats.errorCount << "\n";
    std::cout << " Files Copied: " << stats.totalFilesCopied
              << " | Files Deleted: " << stats.totalFilesDeleted
              << " | Bytes Transferred: " << (stats.totalBytesTransferred / (1024 * 1024)) << " MB\n";
    std::cout << "===========================================================================\n";
    std::cout << "  1. Add Active Folder\n";
    std::cout << "  2. Add Passive Folder\n";
    std::cout << "  3. Remove Synchronization Pair\n";
    std::cout << "  4. Pause Sync Engine\n";
    std::cout << "  5. Resume Sync Engine\n";
    std::cout << "  6. Manual Scan\n";
    std::cout << "  7. Force Full Synchronization\n";
    std::cout << "  8. Display Statistics\n";
    std::cout << "  9. View Activity Logs\n";
    std::cout << " 10. Display Settings & Pair Policies\n";
    std::cout << " 11. Exit EchoSync (Clean Shutdown)\n";
    std::cout << "===========================================================================\n";
}

void ConsoleInterface::ShowMenuOnce() {
    PrintDashboard();
    std::cout << "Select Option [1-11] > ";
}

void ConsoleInterface::RunInteractiveMenu() {
    m_inInteractiveMode = true;
    while (m_controller.IsRunning() && m_inInteractiveMode) {
        PrintDashboard();
        std::cout << "Select Option [1-11] > ";

        int choice = 0;
        if (!(std::cin >> choice)) {
            if (std::cin.eof()) {
                Logger::Instance().Info("ConsoleInterface", "STDIN unavailable; entering headless wait mode.");
                std::cin.clear();
                while (m_controller.IsRunning() && m_inInteractiveMode) {
                    std::this_thread::sleep_for(std::chrono::milliseconds(250));
                }
                break;
            }
            std::cin.clear();
            std::cin.ignore((std::numeric_limits<std::streamsize>::max)(), '\n');
            continue;
        }

        HandleMenuChoice(choice);
        if (choice == 11) {
            break;
        }
    }
}

void ConsoleInterface::HandleMenuChoice(int choice) {
    switch (choice) {
        case 1:  OptionAddPair(); break;
        case 2:  OptionAddPair(); break; // Combined pair adder
        case 3:  OptionRemovePair(); break;
        case 4:  OptionPauseSync(); break;
        case 5:  OptionResumeSync(); break;
        case 6:  OptionManualScan(); break;
        case 7:  OptionForceFullSync(); break;
        case 8:  OptionShowStatistics(); break;
        case 9:  OptionShowLogs(); break;
        case 10: OptionShowSettings(); break;
        case 11:
            std::cout << "\nInitiating clean shutdown...\n";
            m_inInteractiveMode = false;
            m_controller.RequestExit();
            break;
        default:
            std::cout << "\nInvalid choice. Please enter a number between 1 and 11.\n";
            break;
    }
}

void ConsoleInterface::OptionAddPair() {
    std::cout << "\n--- Add Synchronization Pair ---\n";
    std::string pairId, activePath, passivePath, policyStr;

    std::cout << "Enter Pair ID (e.g. Pair_Mods): ";
    std::cin >> pairId;

    std::cout << "Enter Active Folder Path: ";
    std::cin.ignore((std::numeric_limits<std::streamsize>::max)(), '\n');
    std::getline(std::cin, activePath);

    std::cout << "Enter Passive Folder Path: ";
    std::getline(std::cin, passivePath);

    std::cout << "Select Policy [Mirror / OneWay / TwoWay / ReplaceExisting / BackupOnly / Manual] (Default: Mirror): ";
    std::getline(std::cin, policyStr);
    if (policyStr.empty()) policyStr = "Mirror";

    SyncPairConfig newPair;
    newPair.id = pairId;

    auto WStr = [](const std::string& str) {
        int sz = MultiByteToWideChar(CP_UTF8, 0, str.c_str(), -1, nullptr, 0);
        std::wstring w(sz, 0);
        MultiByteToWideChar(CP_UTF8, 0, str.c_str(), -1, &w[0], sz);
        if (!w.empty() && w.back() == L'\0') w.pop_back();
        return w;
    };

    newPair.activePath = WStr(activePath);
    newPair.passivePath = WStr(passivePath);
    newPair.policy = StringToPolicy(policyStr);
    newPair.enabled = true;

    m_controller.GetConfigManager().AddPair(newPair);
    m_controller.GetConfigManager().Save();

    std::cout << "\n[SUCCESS] Pair '" << pairId << "' added and saved to EchoSync.json!\n";
    std::cout << "Press Enter to continue...";
    std::cin.get();
}

void ConsoleInterface::OptionRemovePair() {
    std::cout << "\n--- Remove Synchronization Pair ---\n";
    auto pairs = m_controller.GetConfigManager().GetPairs();
    if (pairs.empty()) {
        std::cout << "No active synchronization pairs configured.\n";
        std::cout << "Press Enter to continue...";
        std::cin.ignore();
        std::cin.get();
        return;
    }

    for (size_t i = 0; i < pairs.size(); ++i) {
        std::cout << " [" << (i + 1) << "] ID: " << pairs[i].id << "\n";
    }

    std::cout << "Enter Pair ID to remove: ";
    std::string pairId;
    std::cin >> pairId;

    if (m_controller.GetConfigManager().RemovePair(pairId)) {
        m_controller.GetConfigManager().Save();
        std::cout << "\n[SUCCESS] Synchronization pair '" << pairId << "' removed.\n";
    } else {
        std::cout << "\n[ERROR] Pair ID '" << pairId << "' not found.\n";
    }
    std::cout << "Press Enter to continue...";
    std::cin.ignore();
    std::cin.get();
}

void ConsoleInterface::OptionPauseSync() {
    m_controller.GetSyncEngine().Pause();
    std::cout << "\n[INFO] Synchronization Engine PAUSED.\n";
    std::cout << "Press Enter to continue...";
    std::cin.ignore();
    std::cin.get();
}

void ConsoleInterface::OptionResumeSync() {
    m_controller.GetSyncEngine().Resume();
    std::cout << "\n[INFO] Synchronization Engine RESUMED.\n";
    std::cout << "Press Enter to continue...";
    std::cin.ignore();
    std::cin.get();
}

void ConsoleInterface::OptionManualScan() {
    std::cout << "\n--- Manual Folder Rescan ---\n";
    auto pairs = m_controller.GetConfigManager().GetPairs();
    if (pairs.empty()) {
        std::cout << "No pairs available for scan.\n";
        std::cout << "Press Enter to continue...";
        std::cin.ignore();
        std::cin.get();
        return;
    }

    for (size_t i = 0; i < pairs.size(); ++i) {
        std::cout << " [" << (i + 1) << "] ID: " << pairs[i].id << "\n";
    }

    std::cout << "Select Pair ID for manual scan: ";
    std::string pairId;
    std::cin >> pairId;

    std::cout << "\nScanning active folder and comparing with passive target...\n";
    if (!m_controller.GetSyncEngine().PerformManualScan(pairId, false)) {
        std::cout << "\n[ERROR] Manual scan failed. Check the log for details.\n";
    } else {
        std::cout << "\n[SUCCESS] Manual scan complete!\n";
    }
    std::cout << "Press Enter to continue...";
    std::cin.ignore();
    std::cin.get();
}

void ConsoleInterface::OptionForceFullSync() {
    std::cout << "\n--- Force Full Synchronization ---\n";
    auto pairs = m_controller.GetConfigManager().GetPairs();
    if (pairs.empty()) {
        std::cout << "No pairs available.\n";
        std::cout << "Press Enter to continue...";
        std::cin.ignore();
        std::cin.get();
        return;
    }

    for (size_t i = 0; i < pairs.size(); ++i) {
        std::cout << " [" << (i + 1) << "] ID: " << pairs[i].id << "\n";
    }

    std::cout << "Select Pair ID to Force Full Sync: ";
    std::string pairId;
    std::cin >> pairId;

    std::cout << "\nForce synchronizing all files regardless of timestamps...\n";
    if (!m_controller.GetSyncEngine().PerformManualScan(pairId, true)) {
        std::cout << "\n[ERROR] Force full synchronization failed. Check the log for details.\n";
    } else {
        std::cout << "\n[SUCCESS] Force full synchronization complete!\n";
    }
    std::cout << "Press Enter to continue...";
    std::cin.ignore();
    std::cin.get();
}

void ConsoleInterface::OptionShowStatistics() {
    auto stats = m_controller.GetSyncEngine().GetStats();
    auto uptime = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::system_clock::now() - stats.startTime).count();

    std::cout << "\n===========================================================================\n";
    std::cout << "                        EchoSync Performance Statistics                    \n";
    std::cout << "===========================================================================\n";
    std::cout << " Application Uptime:       " << uptime << " seconds\n";
    std::cout << " Total Events Detected:    " << stats.totalEventsDetected << "\n";
    std::cout << " Files Copied:             " << stats.totalFilesCopied << "\n";
    std::cout << " Files Deleted:            " << stats.totalFilesDeleted << "\n";
    std::cout << " Files Renamed:            " << stats.totalFilesRenamed << "\n";
    std::cout << " Data Transferred:         " << (stats.totalBytesTransferred / 1024) << " KB ("
              << (stats.totalBytesTransferred / (1024 * 1024)) << " MB)\n";
    std::cout << " Total Sync Processing:    " << stats.totalSyncDurationMs << " ms\n";
    std::cout << " Sync Error Count:         " << stats.errorCount << "\n";
    std::cout << " In-Memory Cache Entries:  " << m_controller.GetMetadataCache().Size() << "\n";
    std::cout << "===========================================================================\n";
    std::cout << "Press Enter to continue...";
    std::cin.ignore();
    std::cin.get();
}

void ConsoleInterface::OptionShowLogs() {
    std::cout << "\n===========================================================================\n";
    std::cout << "                       EchoSync Recent Activity Logs                       \n";
    std::cout << "===========================================================================\n";

    auto logs = Logger::Instance().GetRecentLogs(30);
    if (logs.empty()) {
        std::cout << "No logs recorded yet.\n";
    } else {
        for (const auto& log : logs) {
            auto timeT = std::chrono::system_clock::to_time_t(log.timestamp);
            std::tm tmStruct;
            localtime_s(&tmStruct, &timeT);
            std::cout << "[" << std::put_time(&tmStruct, "%H:%M:%S") << "] [" << log.tag << "] " << log.message << "\n";
        }
    }
    std::cout << "===========================================================================\n";
    std::cout << "Press Enter to continue...";
    std::cin.ignore();
    std::cin.get();
}

void ConsoleInterface::OptionShowSettings() {
    std::cout << "\n===========================================================================\n";
    std::cout << "                    EchoSync Active Pair Configuration                     \n";
    std::cout << "===========================================================================\n";

    auto pairs = m_controller.GetConfigManager().GetPairs();
    if (pairs.empty()) {
        std::cout << "No synchronization pairs configured.\n";
    } else {
        for (const auto& pair : pairs) {
            std::cout << " Pair ID:     " << pair.id << "\n";
            std::cout << " Active:      " << WStringToString(pair.activePath) << "\n";
            std::cout << " Passive:     " << WStringToString(pair.passivePath) << "\n";
            std::cout << " Policy:      " << PolicyToString(pair.policy) << "\n";
            std::cout << " Enabled:     " << (pair.enabled ? "Yes" : "No") << "\n";
            std::cout << " Exclude Dirs: ";
            for (const auto& d : pair.filters.excludeDirectories) std::cout << d << " ";
            std::cout << "\n Exclude Exts: ";
            for (const auto& e : pair.filters.excludeExtensions) std::cout << e << " ";
            std::cout << "\n---------------------------------------------------------------------------\n";
        }
    }
    std::cout << "Press Enter to continue...";
    std::cin.ignore();
    std::cin.get();
}

} // namespace EchoSync

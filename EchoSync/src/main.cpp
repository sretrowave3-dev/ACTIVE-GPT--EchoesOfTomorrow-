#include "../include/AppController.hpp"
#include <windows.h>
#include <iostream>
#include <csignal>

static EchoSync::AppController* g_pController = nullptr;

BOOL WINAPI ConsoleHandlerRoutine(DWORD dwCtrlType) {
    switch (dwCtrlType) {
        case CTRL_C_EVENT:
        case CTRL_BREAK_EVENT:
        case CTRL_CLOSE_EVENT:
        case CTRL_LOGOFF_EVENT:
        case CTRL_SHUTDOWN_EVENT:
            if (g_pController) {
                g_pController->RequestExit();
            }
            return TRUE;
        default:
            return FALSE;
    }
}

int main(int argc, char* argv[]) {
    // Set Console Ctrl handler for graceful shutdown
    SetConsoleCtrlHandler(ConsoleHandlerRoutine, TRUE);

    // Set Windows Console UTF-8 output
    SetConsoleOutputCP(CP_UTF8);
    SetConsoleCP(CP_UTF8);

    EchoSync::AppController controller;
    g_pController = &controller;

    std::string configPath = "EchoSync.json";
    if (argc > 1) {
        configPath = argv[1];
    }

    if (!controller.Init(configPath)) {
        std::cerr << "[CRITICAL] Failed to initialize EchoSync engine.\n";
        return 1;
    }

    // Run interactive TUI loop
    controller.Run();

    g_pController = nullptr;
    return 0;
}

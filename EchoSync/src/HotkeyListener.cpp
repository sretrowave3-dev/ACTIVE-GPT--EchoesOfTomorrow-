#include "../include/HotkeyListener.hpp"
#include "../include/Logger.hpp"

namespace EchoSync {

HotkeyListener::~HotkeyListener() {
    Stop();
}

bool HotkeyListener::Start(HotkeyCallback callback) {
    if (m_running) return true;

    m_callback = callback;
    m_running = true;
    m_thread = std::jthread([this]() { MessageLoop(); });
    return true;
}

void HotkeyListener::Stop() {
    if (!m_running) return;

    m_running = false;
    if (m_threadId != 0) {
        PostThreadMessage(m_threadId, WM_QUIT, 0, 0);
    }

    if (m_thread.joinable()) {
        m_thread.join();
    }
}

void HotkeyListener::MessageLoop() {
    m_threadId = GetCurrentThreadId();

    // VK_OEM_3 is the ` / ~ key
    BOOL registered = RegisterHotKey(NULL, HOTKEY_ID, MOD_SHIFT, VK_OEM_3);
    if (!registered) {
        DWORD err = GetLastError();
        Logger::Instance().Warning("HotkeyListener", "RegisterHotKey (Shift + `) failed. Error: " + std::to_string(err));
    } else {
        Logger::Instance().Info("HotkeyListener", "Registered Global Hotkey: Shift + `");
    }

    MSG msg;
    while (m_running && GetMessage(&msg, NULL, 0, 0)) {
        if (msg.message == WM_HOTKEY && msg.wParam == HOTKEY_ID) {
            if (m_callback) {
                m_callback();
            }
        }
    }

    if (registered) {
        UnregisterHotKey(NULL, HOTKEY_ID);
    }
}

} // namespace EchoSync

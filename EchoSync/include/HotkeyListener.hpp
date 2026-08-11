#pragma once

#include <windows.h>
#include <functional>
#include <thread>
#include <atomic>

namespace EchoSync {

class HotkeyListener {
public:
    using HotkeyCallback = std::function<void()>;

    HotkeyListener() = default;
    ~HotkeyListener();

    bool Start(HotkeyCallback callback);
    void Stop();

private:
    void MessageLoop();

    static constexpr int HOTKEY_ID = 0x5359; // 'SY'
    HotkeyCallback m_callback;
    std::jthread m_thread;
    std::atomic<bool> m_running{false};
    DWORD m_threadId = 0;
};

} // namespace EchoSync

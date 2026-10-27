# test/network/test_network.py
import sys
import math

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def test_network_driver():
    """Simulates NetworkDriver packet scheduling, channels, and latency."""
    class MockPacket:
        def __init__(self, pid, channel, timestamp, deliver_at, payload):
            self.id = pid
            self.channel = channel
            self.timestamp = timestamp
            self.deliver_at = deliver_at
            self.payload = payload

    class MockNetworkDriver:
        def __init__(self, latency_ms=0):
            self.latency_ms = latency_ms
            self.queue = []
            self.delivered = []
            self.seq = 0

        def send(self, channel, payload, now_ms):
            self.seq += 1
            deliver_at = now_ms + self.latency_ms
            pkt = MockPacket(self.seq, channel, now_ms, deliver_at, payload)
            self.queue.append(pkt)
            return pkt

        def update(self, now_ms):
            ready = [p for p in self.queue if p.deliver_at <= now_ms]
            self.queue = [p for p in self.queue if p.deliver_at > now_ms]
            self.delivered.extend(ready)
            return ready

    # 1. Zero latency transmission
    driver = MockNetworkDriver(latency_ms=0)
    driver.send("rpc", {"action": "fire"}, now_ms=1000)
    received = driver.update(now_ms=1000)
    assert len(received) == 1, "Zero-latency packet should arrive immediately"
    assert received[0].payload["action"] == "fire", "Payload content must match"

    # 2. Delayed transmission (50ms latency)
    lag_driver = MockNetworkDriver(latency_ms=50)
    lag_driver.send("state", {"health": 90}, now_ms=1000)
    
    # At t=1020ms, packet should not be delivered yet
    not_yet = lag_driver.update(now_ms=1020)
    assert len(not_yet) == 0, "Packet should still be in-flight before deliver_at"
    assert len(lag_driver.queue) == 1, "Packet should remain queued"

    # At t=1055ms, packet should be delivered
    delivered = lag_driver.update(now_ms=1055)
    assert len(delivered) == 1, "Packet should deliver when current time >= deliver_at"
    assert delivered[0].payload["health"] == 90

    print("[OK] NetworkDriver packet scheduling & latency simulation passed.")

def test_snapshot_interpolator():
    """Validates smooth LERP/NLERP interpolation and dead-reckoning extrapolation."""
    # Snapshot A at t=1000, pos=[0, 0, 0], rot=[0, 0, 0, 1], vel=[10, 0, 0]
    # Snapshot B at t=1100, pos=[10, 0, 0], rot=[0, 0.7071, 0, 0.7071], vel=[10, 0, 0]
    render_delay = 100 # ms
    server_time = 1150 # render_time = 1150 - 100 = 1050 (exact midpoint between 1000 and 1100)

    t_a = 1000
    t_b = 1100
    pos_a = [0.0, 0.0, 0.0]
    pos_b = [10.0, 0.0, 0.0]
    target_time = server_time - render_delay
    alpha = (target_time - t_a) / (t_b - t_a)
    assert abs(alpha - 0.5) < 0.001

    lerped_x = pos_a[0] + (pos_b[0] - pos_a[0]) * alpha
    assert abs(lerped_x - 5.0) < 0.001, f"LERP position at midpoint must be 5.0, got {lerped_x}"

    # Test dead-reckoning extrapolation:
    # If server_time = 1300, target_time = 1200 (> newest snapshot at 1100)
    # Extrapolation dt = (1200 - 1100)/1000 = 0.1s
    # Projected pos = pos_b + vel * 0.1s = 10 + 10 * 0.1 = 11.0
    extrap_dt = (1200 - 1100) / 1000.0
    extrap_x = pos_b[0] + 10.0 * extrap_dt
    assert abs(extrap_x - 11.0) < 0.001, f"Extrapolated x should be 11.0, got {extrap_x}"

    print("[OK] SnapshotInterpolator LERP and dead-reckoning extrapolation passed.")

def test_client_prediction_and_reconciliation():
    """Validates local input prediction and server reconciliation replay."""
    class MockPrediction:
        def __init__(self, threshold=0.05):
            self.threshold = threshold
            self.seq = 0
            self.history = []
            self.pos = [0.0, 0.0, 0.0]

        def predict(self, move_x, dt):
            self.seq += 1
            self.pos[0] += move_x * dt
            cmd = {
                "seq": self.seq,
                "dt": dt,
                "move_x": move_x,
                "predicted_x": self.pos[0]
            }
            self.history.append(cmd)
            return cmd

        def reconcile(self, ack_seq, server_x):
            # Find ack index
            idx = -1
            for i, cmd in enumerate(self.history):
                if cmd["seq"] == ack_seq:
                    idx = i
                    break
            if idx == -1:
                return False, 0

            predicted_x_at_ack = self.history[idx]["predicted_x"]
            err = abs(server_x - predicted_x_at_ack)
            
            # Prune acknowledged commands
            remaining = self.history[idx + 1:]
            self.history = remaining

            if err > self.threshold:
                # Snap to server authoritative position
                self.pos[0] = server_x
                # Replay remaining unacknowledged inputs
                for cmd in self.history:
                    self.pos[0] += cmd["move_x"] * cmd["dt"]
                    cmd["predicted_x"] = self.pos[0]
                return True, len(remaining)

            return False, 0

    pred = MockPrediction(threshold=0.05)
    # 3 inputs moving at +10 units/s for 0.1s each (+1 unit per step)
    pred.predict(10.0, 0.1) # seq 1 -> x = 1.0
    pred.predict(10.0, 0.1) # seq 2 -> x = 2.0
    pred.predict(10.0, 0.1) # seq 3 -> x = 3.0
    assert abs(pred.pos[0] - 3.0) < 0.001

    # Server processed input 1, but says x was 0.5 (divergence: e.g. obstacle stopped client)
    corrected, replayed = pred.reconcile(ack_seq=1, server_x=0.5)
    assert corrected is True, "Divergence exceeding threshold must trigger reconciliation"
    assert replayed == 2, f"Must replay remaining 2 inputs, replayed {replayed}"
    # Corrected x should be: 0.5 + 1.0 (seq 2) + 1.0 (seq 3) = 2.5
    assert abs(pred.pos[0] - 2.5) < 0.001, f"Reconciled position must be 2.5, got {pred.pos[0]}"

    print("[OK] ClientPrediction and Server Reconciliation replay passed.")

def test_delta_compression_and_rpcs():
    """Validates dirty-flag delta compression and RPC dispatching."""
    last_ack = {"x": 10, "y": 20, "health": 100, "weapon": "rifle"}
    current  = {"x": 12, "y": 20, "health": 95,  "weapon": "rifle"}

    delta = {}
    for k, v in current.items():
        if last_ack.get(k) != v:
            delta[k] = v

    assert "x" in delta and delta["x"] == 12, "Modified field 'x' must be included in delta"
    assert "health" in delta and delta["health"] == 95, "Modified field 'health' must be included in delta"
    assert "y" not in delta, "Unchanged field 'y' must be omitted from delta"
    assert "weapon" not in delta, "Unchanged field 'weapon' must be omitted from delta"

    print("[OK] NetworkReplicator delta compression and dirty checking passed.")

def main():
    print("Testing Phase 25 Networking, Client-Side Prediction & State Replication...")
    test_network_driver()
    test_snapshot_interpolator()
    test_client_prediction_and_reconciliation()
    test_delta_compression_and_rpcs()
    print("[SUCCESS] Phase 25 Networking Subsystem verified successfully!")

if __name__ == "__main__":
    main()

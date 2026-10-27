import os
import sys

def test_animation_graph_subsystem():
    print("Testing Phase 24 Animation State Graph & 2D Blend Trees...")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    graph_dir = os.path.join(base_dir, "..", "src", "animation", "graph")

    required_files = [
        "GraphNode.js",
        "AnimationState.js",
        "AnimationTransition.js",
        "BlendTree.js",
        "AnimationGraph.js"
    ]

    for rf in required_files:
        p = os.path.join(graph_dir, rf)
        assert os.path.exists(p), f"Missing animation graph file: {rf}"

    # 1. Verify AnimationState
    with open(os.path.join(graph_dir, "AnimationState.js"), "r", encoding="utf-8") as f:
        content = f.read()
        assert "class AnimationState" in content
        assert "enter" in content
        assert "update" in content
        assert "normalizedTime" in content

    # 2. Verify AnimationTransition
    with open(os.path.join(graph_dir, "AnimationTransition.js"), "r", encoding="utf-8") as f:
        content = f.read()
        assert "class AnimationTransition" in content
        assert "canTransition" in content
        assert "hasExitTime" in content

    # 3. Verify BlendTree
    with open(os.path.join(graph_dir, "BlendTree.js"), "r", encoding="utf-8") as f:
        content = f.read()
        assert "class BlendTree" in content
        assert "evaluateWeights" in content
        assert "addSample" in content

    # 4. Verify AnimationGraph
    with open(os.path.join(graph_dir, "AnimationGraph.js"), "r", encoding="utf-8") as f:
        content = f.read()
        assert "class AnimationGraph" in content
        assert "addState" in content
        assert "addTransition" in content
        assert "setParameter" in content
        assert "transitionProgress" in content

    print("[SUCCESS] Phase 24 Animation State Graph & Blend Trees verified successfully!")

if __name__ == "__main__":
    test_animation_graph_subsystem()

package com.observatory.engine;

import com.observatory.exception.ExpressionException;
import com.observatory.model.ExpressionNode;
import com.observatory.model.Token;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Stack;

@Component
public class ExpressionTreeBuilder {

    public ExpressionNode buildTree(List<Token> postfixTokens) {
        if (postfixTokens == null || postfixTokens.isEmpty()) {
            throw new ExpressionException("Cannot build expression tree from empty postfix sequence.", "TREE_BUILD");
        }

        Stack<ExpressionNode> nodeStack = new Stack<>();
        int nodeCounter = 1;

        for (Token token : postfixTokens) {
            String nodeId = "n" + (nodeCounter++);
            Token.Type type = token.getType();

            if (type == Token.Type.NUMBER || type == Token.Type.VARIABLE) {
                nodeStack.push(new ExpressionNode(nodeId, token.getValue(), type.name()));
            } else if (type == Token.Type.UNARY_OPERATOR) {
                if (nodeStack.isEmpty()) {
                    throw new ExpressionException(
                            "Insufficient operands for unary negation at position " + token.getPosition() + ".",
                            "TREE_BUILD",
                            token.getPosition()
                    );
                }
                ExpressionNode operand = nodeStack.pop();
                nodeStack.push(new ExpressionNode(nodeId, "NEG", type.name(), operand, null));
            } else if (type == Token.Type.OPERATOR) {
                if (nodeStack.size() < 2) {
                    throw new ExpressionException(
                            "Insufficient operands for binary operator '" + token.getValue() + "' at position " + token.getPosition() + ".",
                            "TREE_BUILD",
                            token.getPosition()
                    );
                }
                ExpressionNode right = nodeStack.pop();
                ExpressionNode left = nodeStack.pop();
                nodeStack.push(new ExpressionNode(nodeId, token.getValue(), type.name(), left, right));
            }
        }

        if (nodeStack.size() != 1) {
            throw new ExpressionException(
                    "Invalid expression structure: expected 1 root node but found " + nodeStack.size() + ".",
                    "TREE_BUILD"
            );
        }

        return nodeStack.pop();
    }

    public List<ExpressionNode> postorderNodes(ExpressionNode root) {
        List<ExpressionNode> nodes = new ArrayList<>();
        postorderNodesRecursive(root, nodes);
        return nodes;
    }

    private void postorderNodesRecursive(ExpressionNode node, List<ExpressionNode> nodes) {
        if (node == null) return;
        postorderNodesRecursive(node.getLeft(), nodes);
        postorderNodesRecursive(node.getRight(), nodes);
        nodes.add(node);
    }

    public List<String> preorder(ExpressionNode root) {
        List<String> out = new ArrayList<>();
        preorderRecursive(root, out);
        return out;
    }

    private void preorderRecursive(ExpressionNode node, List<String> out) {
        if (node == null) return;
        out.add(node.getValue());
        preorderRecursive(node.getLeft(), out);
        preorderRecursive(node.getRight(), out);
    }

    public List<String> inorder(ExpressionNode root) {
        List<String> out = new ArrayList<>();
        inorderRecursive(root, out);
        return out;
    }

    private void inorderRecursive(ExpressionNode node, List<String> out) {
        if (node == null) return;
        if ("UNARY_OPERATOR".equals(node.getType())) {
            out.add("(-");
            inorderRecursive(node.getLeft(), out);
            out.add(")");
            return;
        }
        boolean isBinary = "OPERATOR".equals(node.getType());
        if (isBinary) out.add("(");
        inorderRecursive(node.getLeft(), out);
        out.add(node.getValue());
        inorderRecursive(node.getRight(), out);
        if (isBinary) out.add(")");
    }

    public List<String> postorder(ExpressionNode root) {
        List<String> out = new ArrayList<>();
        postorderRecursive(root, out);
        return out;
    }

    private void postorderRecursive(ExpressionNode node, List<String> out) {
        if (node == null) return;
        postorderRecursive(node.getLeft(), out);
        postorderRecursive(node.getRight(), out);
        out.add(node.getValue());
    }

    public String toTextTree(ExpressionNode root) {
        if (root == null) return "";
        StringBuilder sb = new StringBuilder();
        sb.append(formatNodeText(root)).append("\n");
        List<ExpressionNode> children = new ArrayList<>();
        if (root.getLeft() != null) children.add(root.getLeft());
        if (root.getRight() != null) children.add(root.getRight());
        for (int i = 0; i < children.size(); i++) {
            boolean isLast = (i == children.size() - 1);
            String branchLabel = (root.getLeft() != null && root.getRight() != null)
                    ? (i == 0 ? "[L] " : "[R] ")
                    : ("UNARY_OPERATOR".equals(root.getType()) ? "[operand] " : "");
            buildTextTreeRecursive(children.get(i), "", isLast, branchLabel, sb);
        }
        return sb.toString().trim();
    }

    private void buildTextTreeRecursive(
            ExpressionNode node,
            String prefix,
            boolean isLast,
            String branchLabel,
            StringBuilder sb) {
        sb.append(prefix)
          .append(isLast ? "└── " : "├── ")
          .append(branchLabel)
          .append(formatNodeText(node))
          .append("\n");

        List<ExpressionNode> children = new ArrayList<>();
        if (node.getLeft() != null) children.add(node.getLeft());
        if (node.getRight() != null) children.add(node.getRight());

        String childPrefix = prefix + (isLast ? "    " : "│   ");
        for (int i = 0; i < children.size(); i++) {
            boolean childIsLast = (i == children.size() - 1);
            String childLabel = (node.getLeft() != null && node.getRight() != null)
                    ? (i == 0 ? "[L] " : "[R] ")
                    : ("UNARY_OPERATOR".equals(node.getType()) ? "[operand] " : "");
            buildTextTreeRecursive(children.get(i), childPrefix, childIsLast, childLabel, sb);
        }
    }

    private String formatNodeText(ExpressionNode node) {
        String label = "UNARY_OPERATOR".equals(node.getType()) ? "NEG (-)" : node.getValue();
        if (node.getEvaluatedValue() != null) {
            if ("OPERATOR".equals(node.getType()) || "UNARY_OPERATOR".equals(node.getType())) {
                return label + "  [= " + node.getEvaluatedValue() + "]";
            }
            if ("VARIABLE".equals(node.getType())) {
                return label + " (= " + node.getEvaluatedValue() + ")";
            }
        }
        return label;
    }
}

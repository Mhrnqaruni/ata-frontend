// /src/components/tools/ToolCard.jsx
// One AI tool as a glass card: the AI-gradient tile, its name, one line, and "Open".
import React from "react";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import GlassLink from "../common/GlassLink";

const ToolCard = ({ tool }) => (
  <GlassLink className="mst-tool-card" to={tool.path}>
    <span aria-hidden="true" className="mst-tile" data-ai="true" data-size="lg">{tool.icon}</span>
    <span className="mst-tool-card-title">{tool.title}</span>
    <span className="mst-tool-card-desc">{tool.description}</span>
    <span className="mst-tool-card-open">
      Open
      <ArrowForwardRounded aria-hidden="true" />
    </span>
  </GlassLink>
);

export default ToolCard;

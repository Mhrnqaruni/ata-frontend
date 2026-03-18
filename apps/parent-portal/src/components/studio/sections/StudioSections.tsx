/**
 * StudioSections Component
 * Educational Note: Renders all studio feature sections.
 * Each section is isolated - only re-renders when its own state changes.
 * This replaces the old StudioGeneratedContent + StudioProgressIndicators + StudioModals pattern.
 */

import React from 'react';
import { useStudioContext } from '../StudioContext';

// Import all sections
import { AudioSection } from './AudioSection';
import { QuizSection } from './QuizSection';
import { FlashCardSection } from './FlashCardSection';
import { MindMapSection } from './MindMapSection';
import { AdSection } from './AdSection';
import { SocialSection } from './SocialSection';
import { InfographicSection } from './InfographicSection';
import { EmailSection } from './EmailSection';
import { WebsiteSection } from './WebsiteSection';
import { ComponentSection } from './ComponentSection';
import { VideoSection } from './VideoSection';
import { FlowDiagramSection } from './FlowDiagramSection';
import { WireframeSection } from './WireframeSection';
import { PresentationSection } from './PresentationSection';
import { PRDSection } from './PRDSection';
import { MarketingStrategySection } from './MarketingStrategySection';
import { BlogSection } from './BlogSection';
import { BusinessReportSection } from './BusinessReportSection';

export const StudioSections: React.FC = () => {
  const { allowedItemIds } = useStudioContext();
  const allowed = new Set(allowedItemIds);

  return (
    <>
      {/* Learning Sections */}
      {allowed.has('audio_overview') ? <AudioSection /> : null}
      {allowed.has('quiz') ? <QuizSection /> : null}
      {allowed.has('flash_cards') ? <FlashCardSection /> : null}
      {allowed.has('mind_map') ? <MindMapSection /> : null}

      {/* Business Sections */}
      {allowed.has('business_report') ? <BusinessReportSection /> : null}
      {allowed.has('marketing_strategy') ? <MarketingStrategySection /> : null}
      {allowed.has('prd') ? <PRDSection /> : null}
      {allowed.has('infographics') ? <InfographicSection /> : null}
      {allowed.has('flow_diagram') ? <FlowDiagramSection /> : null}
      {allowed.has('wireframes') ? <WireframeSection /> : null}
      {allowed.has('presentation') ? <PresentationSection /> : null}

      {/* Content Sections */}
      {allowed.has('blog') ? <BlogSection /> : null}
      {allowed.has('social') ? <SocialSection /> : null}
      {allowed.has('website') ? <WebsiteSection /> : null}
      {allowed.has('email_templates') ? <EmailSection /> : null}
      {allowed.has('components') ? <ComponentSection /> : null}
      {allowed.has('ads_creative') ? <AdSection /> : null}
      {allowed.has('video') ? <VideoSection /> : null}
    </>
  );
};

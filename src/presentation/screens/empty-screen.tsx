import type { ReactElement } from 'react';
import { Faq, SiteFooter } from './landing/faq';
import { Hero } from './landing/hero';
import { HowItWorks, WhatItFinds } from './landing/landing-sections';

interface EmptyScreenProps {
  readonly onFile: (file: File) => void;
}

/** Start page: hero with the drop zone and privacy promise, then how it works, what it finds, FAQ. */
export const EmptyScreen = ({ onFile }: EmptyScreenProps): ReactElement => (
  <div className="landing">
    <Hero onFile={onFile} />
    <HowItWorks />
    <WhatItFinds />
    <Faq />
    <SiteFooter />
  </div>
);

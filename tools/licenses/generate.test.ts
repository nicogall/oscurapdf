import { describe, expect, it } from 'vitest';
import { ALLOWED, productionPackages, render } from './generate';

describe('third-party licences', () => {
  it('every package shipped to the browser has an allowed licence', () => {
    const packages = productionPackages();
    expect(packages.map((p) => p.name)).toEqual(expect.arrayContaining(['mupdf', 'pdfjs-dist', 'react', '@huggingface/transformers']));
    expect(packages.filter((p) => !ALLOWED.has(p.license))).toEqual([]);
  });

  it('the notice names the app licence, MuPDF and the model attribution', () => {
    const text = render([{ name: 'example', version: '1.0.0', license: 'MIT', text: 'MIT text' }]);
    expect(text).toContain('AGPL-3.0-or-later');
    expect(text).toContain('MuPDF');
    expect(text).toContain('AFL-3.0');
    expect(text).toContain('example 1.0.0 — MIT');
  });
});

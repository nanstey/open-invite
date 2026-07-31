import { describe, expect, it } from 'vitest';
import { computeFunctionComplexities } from './complexity.mjs';
import { findFileCoverage, functionCoverage } from './coverage.mjs';
import { coverageToReachThreshold, crapScore, scoreFunctions } from './crap.mjs';

describe('crapScore', () => {
  it('equals complexity when coverage is 100%', () => {
    expect(crapScore(6, 100)).toBe(6);
    expect(crapScore(25, 100)).toBe(25);
  });

  it('equals comp^2 + comp when coverage is 0%', () => {
    expect(crapScore(6, 0)).toBe(42); // 36 + 6
    expect(crapScore(10, 0)).toBe(110); // 100 + 10
  });

  it('scales with the cube of the uncovered fraction', () => {
    // comp=10, 50% covered -> 100 * 0.5^3 + 10 = 22.5
    expect(crapScore(10, 50)).toBeCloseTo(22.5, 5);
  });

  it('clamps coverage outside 0..100', () => {
    expect(crapScore(4, 150)).toBe(4);
    expect(crapScore(4, -20)).toBe(20);
  });
});

describe('coverageToReachThreshold', () => {
  it('returns the coverage that brings the score to the threshold', () => {
    const cov = coverageToReachThreshold(10, 30);
    expect(cov).not.toBeNull();
    expect(crapScore(10, cov as number)).toBeCloseTo(30, 5);
  });

  it('returns null when complexity alone exceeds the threshold', () => {
    // At 100% coverage the score is `complexity`, still above 30.
    expect(coverageToReachThreshold(35, 30)).toBeNull();
  });

  it('never asks for less than 0 or more than 100', () => {
    expect(coverageToReachThreshold(2, 30)).toBe(0); // already under at 0% coverage
    expect(coverageToReachThreshold(30, 30)).toBeNull();
  });
});

describe('computeFunctionComplexities', () => {
  it('counts decision points per ESLint complexity semantics', () => {
    const src = `
      export function branchy(x: number) {
        if (x > 0 && x < 10) return 'a'
        for (let i = 0; i < x; i++) {
          if (i % 2 === 0) continue
        }
        switch (x) {
          case 1: return 'one'
          case 2: return 'two'
          default: return 'other'
        }
        return x ? 'y' : 'n'
      }
    `;
    const [fn] = computeFunctionComplexities(src, 'sample.ts');
    // 1 base + if + && + for + inner-if + case*2 (default excluded) + ternary = 8
    expect(fn.name).toBe('branchy');
    expect(fn.complexity).toBe(8);
  });

  it('scopes nested functions separately from their parent', () => {
    const src = `
      function outer(items: number[]) {
        return items.map(v => (v > 0 ? v : -v))
      }
    `;
    const fns = computeFunctionComplexities(src, 'sample.ts');
    const outer = fns.find(f => f.name === 'outer');
    const cb = fns.find(f => f.kind === 'arrow');
    expect(outer?.complexity).toBe(1); // the ternary belongs to the callback, not outer
    expect(cb?.complexity).toBe(2);
  });

  it('names methods, arrows, and getters usefully', () => {
    const src = `
      class Foo {
        bar(n: number) { return n > 0 ? 1 : 0 }
        baz = (n: number) => n && n > 1
        get id() { return 1 }
      }
      const handler = () => 1
    `;
    const names = computeFunctionComplexities(src, 'sample.tsx').map(f => `${f.kind}:${f.name}`);
    expect(names).toContain('method:Foo.bar');
    expect(names).toContain('arrow:Foo.baz');
    expect(names).toContain('getter:Foo.get id');
    expect(names).toContain('arrow:handler');
  });

  it('handles TSX syntax', () => {
    const src = `
      export function Component({ show }: { show: boolean }) {
        return <div>{show ? <span>a</span> : null}</div>
      }
    `;
    const [fn] = computeFunctionComplexities(src, 'Component.tsx');
    expect(fn.name).toBe('Component');
    expect(fn.complexity).toBe(2); // base + ternary
  });
});

describe('functionCoverage', () => {
  const fileCoverage = {
    statementMap: {
      '0': { start: { line: 2 }, end: { line: 2 } },
      '1': { start: { line: 3 }, end: { line: 3 } },
      '2': { start: { line: 4 }, end: { line: 4 } },
      '3': { start: { line: 20 }, end: { line: 20 } }, // outside range
    },
    s: { '0': 5, '1': 0, '2': 3, '3': 0 },
    fnMap: { '0': { decl: { start: { line: 2 } } } },
    f: { '0': 5 },
  };

  it('reports the fraction of in-range statements executed', () => {
    const cov = functionCoverage(fileCoverage, 2, 4);
    expect(cov.hasData).toBe(true);
    expect(cov.coverage).toBeCloseTo((2 / 3) * 100, 5); // 2 of 3 statements covered
  });

  it('reports 0% when no in-range statement ran', () => {
    const cov = functionCoverage({ ...fileCoverage, s: { '0': 0, '1': 0, '2': 0, '3': 0 } }, 2, 4);
    expect(cov.coverage).toBe(0);
  });

  it('treats a missing file entry as uncovered with no data', () => {
    const cov = functionCoverage(null, 1, 10);
    expect(cov).toEqual({ covered: false, hasData: false, coverage: 0 });
  });
});

describe('findFileCoverage', () => {
  it('matches by suffix when absolute roots differ', () => {
    const data = { '/ci/checkout/services/eventService.ts': { statementMap: {}, s: {} } };
    const entry = findFileCoverage(data, 'services/eventService.ts');
    expect(entry).toBe(data['/ci/checkout/services/eventService.ts']);
  });

  it('returns null for an unknown file', () => {
    expect(findFileCoverage({}, 'services/missing.ts')).toBeNull();
  });
});

describe('scoreFunctions (integration)', () => {
  it('flags complex, uncovered functions and passes simple covered ones', () => {
    const functions = [
      { name: 'risky', kind: 'function', startLine: 1, endLine: 20, complexity: 9 },
      { name: 'safe', kind: 'function', startLine: 21, endLine: 25, complexity: 2 },
    ];
    const coverageFor = (start: number) =>
      start === 1
        ? { covered: false, hasData: true, coverage: 0 }
        : { covered: true, hasData: true, coverage: 100 };
    const [risky, safe] = scoreFunctions(functions, coverageFor, { threshold: 30 });
    expect(risky.over).toBe(true);
    expect(risky.crap).toBe(90);
    expect(safe.over).toBe(false);
    expect(safe.crap).toBe(2);
  });
});

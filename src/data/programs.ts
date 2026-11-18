import source from '../../data/all.yaml?raw';
import { parsePrograms } from '@/lib/programs.mjs';

// Build-time data only. Never import this module into a browser script:
// referral destinations belong in go/*.html, not in the landing's client bundle.
export const programs = parsePrograms(source);

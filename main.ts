import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
// Per opcode byte, char code minus 35 = 1 + imm*16 + pops*4 + pushes; 0 = no such opcode.
// (imm 0..4, pops 0..3, pushes 0..3, so the value fits one printable char.)
const T = '$5e(*./3########-------)---)---#---#############DHHD$###########),##############((%(';
for (const id of readdirSync(I).sort()) {
  const P = readFileSync(join(I, id, 'program.bin'));
  const B = readFileSync(join(I, id, 'input.bin'));
  const n = P.length;
  const D = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256);
  const U = new Uint8Array(65536);
  let sp = 0, cp = 0, pc = 0, st = 0, ip = 0, ol = 0, ex = 0;
  for (;;) {
    if (st === 1000000) { ex = 10; break; }
    if (pc < 0 || pc >= n) { ex = 9; break; }
    const op = P[pc];
    const k = T.charCodeAt(op) - 35;
    if (!(k > 0)) { ex = 5; break; }
    const j = k - 1, imm = j >> 4, pops = (j >> 2) & 3, push = j & 3;
    if (pc + imm >= n) { ex = 9; break; }
    st++;
    const nx = pc + 1 + imm;
    if (sp < pops) { ex = 2; break; }
    if (sp - pops + push > 256) { ex = 3; break; }
    pc = nx;
    if (op === 0) { ex = 0; break; } // HALT
    else if (op === 1) D[sp++] = (P[nx - 1] << 24) >> 24; // PUSH8, sign-extended
    else if (op === 2) D[sp++] = P[nx - 4] | (P[nx - 3] << 8) | (P[nx - 2] << 16) | (P[nx - 1] << 24); // PUSH32
    else if (op === 3) sp--; // POP
    else if (op === 4) { D[sp] = D[sp - 1]; sp++; } // DUP
    else if (op === 5) { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; } // SWAP
    else if (op === 6) { D[sp] = D[sp - 2]; sp++; } // OVER
    else if (op === 7) { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; } // ROT
    else if (op === 23) D[sp - 1] = -D[sp - 1] | 0; // NEG
    else if (op === 27) D[sp - 1] = ~D[sp - 1]; // NOT
    else if (op >= 16 && op <= 34) { // binary ops
      const b = D[sp - 1], a = D[sp - 2];
      let r;
      if (op === 16) r = (a + b) | 0; // ADD
      else if (op === 17) r = (a - b) | 0; // SUB
      else if (op === 18) r = Math.imul(a, b); // MUL, low 32 bits
      else if (op === 19) { // DIV, trunc toward zero; MIN/-1 wraps via |0
        if (!b) { ex = 4; break; }
        r = (a / b) | 0;
      } else if (op === 20) { // MOD, sign of a; x%-1 is 0
        if (!b) { ex = 4; break; }
        r = b === -1 ? 0 : (a % b) | 0;
      } else if (op === 21) { // DIVU
        if (!b) { ex = 4; break; }
        r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
      } else if (op === 22) { // MODU
        if (!b) { ex = 4; break; }
        r = ((a >>> 0) % (b >>> 0)) | 0;
      } else if (op === 24) r = a & b; // AND
      else if (op === 25) r = a | b; // OR
      else if (op === 26) r = a ^ b; // XOR
      else if (op === 28) r = a << (b & 31); // SHL
      else if (op === 29) r = a >> (b & 31); // SHR
      else if (op === 30) r = (a >>> (b & 31)) | 0; // SHRU
      else if (op === 32) r = a === b ? 1 : 0; // EQ
      else if (op === 33) r = a < b ? 1 : 0; // LT
      else r = (a >>> 0) < (b >>> 0) ? 1 : 0; // LTU
      sp -= 2; D[sp++] = r;
    }
    else if (op >= 48 && op <= 51) { // JMP JZ JNZ CALL
      if (op === 51) {
        if (cp === 64) { ex = 7; break; }
        C[cp++] = nx;
        pc = P[nx - 2] | (P[nx - 1] << 8);
      } else {
        const rel = ((P[nx - 2] | (P[nx - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 48) { const v = D[--sp]; take = op === 49 ? v === 0 : v !== 0; }
        if (take) pc = nx + rel;
      }
    }
    else if (op === 52) { // RET
      if (!cp) { ex = 8; break; }
      pc = C[--cp];
    }
    else if (op === 64) { // LOAD
      const a = D[sp - 1];
      if (a < 0 || a > 255) { ex = 6; break; }
      D[sp - 1] = M[a];
    }
    else if (op === 65) { // STORE
      const a = D[sp - 1], v = D[sp - 2];
      if (a < 0 || a > 255) { ex = 6; break; }
      sp -= 2; M[a] = v;
    }
    else if (op === 80) { // PRINT
      const s = String(D[sp - 1]);
      if (ol + s.length > 65536) { ex = 11; break; }
      sp--;
      for (let i = 0; i < s.length; i++) U[ol++] = s.charCodeAt(i);
    }
    else if (op === 81) { // PUTC
      if (ol + 1 > 65536) { ex = 11; break; }
      U[ol++] = D[--sp] & 255;
    }
    else if (op === 82) D[sp++] = ip < B.length ? B[ip++] : -1; // IN
    else { ex = D[--sp] & 255; break; } // EXIT (op 83)
  }
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), U.slice(0, ol));
  writeFileSync(join(O, id, 'exit.txt'), String(ex) + '\n');
}

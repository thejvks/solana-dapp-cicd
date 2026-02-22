/** Type declarations for the Counter IDL — keeps tsc happy */

export interface CounterIDL {
  version: string;
  name: string;
  metadata: { address: string };
  instructions: Array<{
    name: string;
    accounts: Array<{ name: string; isMut: boolean; isSigner: boolean }>;
    args: Array<{ name: string; type: string }>;
  }>;
  accounts: Array<{
    name: string;
    type: {
      kind: string;
      fields: Array<{ name: string; type: string }>;
    };
  }>;
  errors: Array<{ code: number; name: string; msg: string }>;
}

declare const idl: CounterIDL;
export default idl;

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { AnchorProvider, BN, Program, web3 } from "@coral-xyz/anchor";
import Head from "next/head";

import idl from "../idl/counter.json";

const PROGRAM_ID = new web3.PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ||
    "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createProgram(provider: AnchorProvider): any {
  // Cast to any to avoid Anchor's deep generic type instantiation (TS2589)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (Program as any)(idl, provider);
}

export default function Home() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState<string>("");

  const getProvider = useCallback((): AnchorProvider | null => {
    if (!wallet.publicKey) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new AnchorProvider(connection, wallet as any, {
      commitment: "confirmed",
    });
  }, [connection, wallet]);

  const getCounterPDA = useCallback((): web3.PublicKey | null => {
    if (!wallet.publicKey) return null;
    const [pda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("counter"), wallet.publicKey.toBuffer()],
      PROGRAM_ID
    );
    return pda;
  }, [wallet.publicKey]);

  const fetchCount = useCallback(async () => {
    const provider = getProvider();
    const pda = getCounterPDA();
    if (!provider || !pda) return;

    try {
      const program = createProgram(provider);
      const account = await program.account.counter.fetch(pda);
      setCount((account.count as BN).toNumber());
    } catch {
      setCount(null);
    }
  }, [getProvider, getCounterPDA]);

  useEffect(() => {
    if (wallet.publicKey) {
      fetchCount();
    }
  }, [wallet.publicKey, fetchCount]);

  const initialize = async () => {
    const provider = getProvider();
    const pda = getCounterPDA();
    if (!provider || !pda || !wallet.publicKey) return;

    setLoading(true);
    try {
      const program = createProgram(provider);
      const tx = await program.methods
        .initialize()
        .accounts({
          counter: pda,
          authority: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();
      setTxSig(tx);
      await fetchCount();
    } catch (err: unknown) {
      console.error("Initialize error:", err);
    }
    setLoading(false);
  };

  const increment = async () => {
    const provider = getProvider();
    const pda = getCounterPDA();
    if (!provider || !pda || !wallet.publicKey) return;

    setLoading(true);
    try {
      const program = createProgram(provider);
      const tx = await program.methods
        .increment()
        .accounts({ counter: pda, authority: wallet.publicKey })
        .rpc();
      setTxSig(tx);
      await fetchCount();
    } catch (err: unknown) {
      console.error("Increment error:", err);
    }
    setLoading(false);
  };

  const decrement = async () => {
    const provider = getProvider();
    const pda = getCounterPDA();
    if (!provider || !pda || !wallet.publicKey) return;

    setLoading(true);
    try {
      const program = createProgram(provider);
      const tx = await program.methods
        .decrement()
        .accounts({ counter: pda, authority: wallet.publicKey })
        .rpc();
      setTxSig(tx);
      await fetchCount();
    } catch (err: unknown) {
      console.error("Decrement error:", err);
    }
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>Solana Counter DApp — CI/CD Demo</title>
        <meta
          name="description"
          content="Counter DApp deployed via automated CI/CD pipeline"
        />
      </Head>

      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          background: "#0a0a0a",
          color: "#e0e0e0",
        }}
      >
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
          Solana Counter DApp
        </h1>
        <p style={{ color: "#888", marginBottom: "2rem" }}>
          Deployed via CI/CD Pipeline |{" "}
          {process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"}
        </p>

        <WalletMultiButton />

        {wallet.publicKey && (
          <div
            style={{
              marginTop: "2rem",
              textAlign: "center",
              padding: "2rem",
              border: "1px solid #333",
              borderRadius: "12px",
              minWidth: "300px",
            }}
          >
            {count === null ? (
              <div>
                <p>No counter found. Initialize one!</p>
                <button
                  onClick={initialize}
                  disabled={loading}
                  style={btnStyle}
                >
                  {loading ? "..." : "Initialize Counter"}
                </button>
              </div>
            ) : (
              <div>
                <p
                  style={{
                    fontSize: "4rem",
                    fontWeight: "bold",
                    margin: "1rem 0",
                  }}
                >
                  {count}
                </p>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                  <button
                    onClick={decrement}
                    disabled={loading}
                    style={btnStyle}
                  >
                    {loading ? "..." : "- Decrement"}
                  </button>
                  <button
                    onClick={increment}
                    disabled={loading}
                    style={{ ...btnStyle, background: "#14F195" }}
                  >
                    {loading ? "..." : "+ Increment"}
                  </button>
                </div>
              </div>
            )}

            {txSig && (
              <p style={{ marginTop: "1rem", fontSize: "0.8rem", color: "#888" }}>
                Last tx:{" "}
                <a
                  href={`https://explorer.solana.com/tx/${txSig}?cluster=${
                    process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"
                  }`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#9945FF" }}
                >
                  {txSig.slice(0, 20)}...
                </a>
              </p>
            )}
          </div>
        )}

        <footer style={{ marginTop: "3rem", color: "#555", fontSize: "0.8rem" }}>
          <p>Program ID: {PROGRAM_ID.toString().slice(0, 20)}...</p>
          <p>
            Built with Anchor + Next.js | Deployed via{" "}
            <a
              href="https://github.com"
              style={{ color: "#9945FF" }}
            >
              GitHub Actions CI/CD
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "12px 24px",
  fontSize: "1rem",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  background: "#9945FF",
  color: "white",
  fontFamily: "monospace",
  fontWeight: "bold",
};

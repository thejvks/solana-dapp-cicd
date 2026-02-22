import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Counter } from "../target/types/counter";
import { expect } from "chai";

describe("counter", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Counter as Program<Counter>;
  const authority = provider.wallet;

  const [counterPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("counter"), authority.publicKey.toBuffer()],
    program.programId
  );

  it("initializes the counter", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        counter: counterPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize tx:", tx);

    const account = await program.account.counter.fetch(counterPda);
    expect(account.count.toNumber()).to.equal(0);
    expect(account.authority.toString()).to.equal(
      authority.publicKey.toString()
    );
  });

  it("increments the counter", async () => {
    const tx = await program.methods
      .increment()
      .accounts({
        counter: counterPda,
        authority: authority.publicKey,
      })
      .rpc();

    console.log("Increment tx:", tx);

    const account = await program.account.counter.fetch(counterPda);
    expect(account.count.toNumber()).to.equal(1);
  });

  it("increments the counter again", async () => {
    await program.methods
      .increment()
      .accounts({
        counter: counterPda,
        authority: authority.publicKey,
      })
      .rpc();

    const account = await program.account.counter.fetch(counterPda);
    expect(account.count.toNumber()).to.equal(2);
  });

  it("decrements the counter", async () => {
    await program.methods
      .decrement()
      .accounts({
        counter: counterPda,
        authority: authority.publicKey,
      })
      .rpc();

    const account = await program.account.counter.fetch(counterPda);
    expect(account.count.toNumber()).to.equal(1);
  });

  it("sets the counter to a specific value", async () => {
    await program.methods
      .set(new anchor.BN(42))
      .accounts({
        counter: counterPda,
        authority: authority.publicKey,
      })
      .rpc();

    const account = await program.account.counter.fetch(counterPda);
    expect(account.count.toNumber()).to.equal(42);
  });

  it("fails when non-authority tries to increment", async () => {
    const fakeUser = anchor.web3.Keypair.generate();

    try {
      await program.methods
        .increment()
        .accounts({
          counter: counterPda,
          authority: fakeUser.publicKey,
        })
        .signers([fakeUser])
        .rpc();

      expect.fail("Should have thrown an error");
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      console.log("Correctly rejected unauthorized access");
    }
  });

  it("fails when trying to decrement below zero", async () => {
    // First set to 0
    await program.methods
      .set(new anchor.BN(0))
      .accounts({
        counter: counterPda,
        authority: authority.publicKey,
      })
      .rpc();

    try {
      await program.methods
        .decrement()
        .accounts({
          counter: counterPda,
          authority: authority.publicKey,
        })
        .rpc();

      expect.fail("Should have thrown an error");
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      console.log("Correctly prevented underflow");
    }
  });
});

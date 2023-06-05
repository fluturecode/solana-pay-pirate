import { PublicKey, Keypair, Connection, Transaction, TransactionInstruction, SystemProgram} from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const payer = Keypair.fromSecretKey(bs58.decode(process.env.PAYER));
const GOLD_TOKEN_MINT = new PublicKey('goLdQwNaZToyavwkbuPJzTt5XPNR3H7WQBGenWtzPH3');
const SEVEN_SEAS_PROGRAM = new PublicKey('2a4NcnkF5zf14JQXHAv39AsRf7jMFj13wKmTL6ZcDQNd');

/**
 * @typedef {import('@vercel/node').VercelResponse} VercelResponse
 * @typedef {import('@vercel/node').VercelRequest} VercelRequest
 *
 * @param {VercelRequest} request
 * @param {VercelResponse} response
 * @returns {Promise<VercelResponse>}
 * */
export default async function handler(request, response) {
  console.log('handling request', request.method);
  if (request.method === 'GET') {
    return handleGet(response);
  } else if (request.method === 'POST') {
    return handlePost(request, response);
  } else {
    return response.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * @param {VercelResponse} response
 */
function handleGet(response) {
  return response.status(200).json({
    label: 'Chutulu Fire!',
    icon: 'https://github.com/solana-developers/pirate-bootcamp/blob/main/assets/kraken-1.png?raw=true',
  });
}

/**
 * @param {VercelRequest} request
 * @param {VercelResponse} response
 */
async function handlePost(request, response) {
  console.log('account', request.body .account);
  const player = new PublicKey(request.body.account);
  
  const chutuluIx = await createChutuluIx(player);

  const transaction = await prepareTx(chutuluIx);

  return response.status(200).json({
    transaction,
    message: 'Chutulu Fire!',
  });
}

/**
 * @typedef {import('@solana/spl-token').Account} Account
 *
 * @param {PublicKey} player
 * @returns {Promise<TransactionInstruction>}
 */
async function createChutuluIx(player) {
  const playerTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    GOLD_TOKEN_MINT,
    player,
  );

  const [level] = PublicKey.findProgramAddressSync([Buffer.from('level')], SEVEN_SEAS_PROGRAM);
  
  const [chestVault] = PublicKey.findProgramAddressSync(
    [Buffer.from('chestVault')],
    SEVEN_SEAS_PROGRAM,
  );
  
  const [gameActions] = PublicKey.findProgramAddressSync(
    [Buffer.from('gameActions')],
    SEVEN_SEAS_PROGRAM,
  );
  
  let [tokenAccountOwnerPda] = await PublicKey.findProgramAddressSync(
    [Buffer.from('token_account_owner_pda', 'utf8')],
    SEVEN_SEAS_PROGRAM,
  );
  
  let [tokenVault] = await PublicKey.findProgramAddressSync(
    [Buffer.from('token_vault', 'utf8'), GOLD_TOKEN_MINT.toBuffer()],
    SEVEN_SEAS_PROGRAM,
  );

  return new TransactionInstruction({
    programId: SEVEN_SEAS_PROGRAM,
    keys: [
      {
        pubkey: chestVault,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: level,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: gameActions,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: player,
        isWritable: true,
        isSigner: true,
      },
      {
        pubkey: SystemProgram.programId,
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: player,
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: playerTokenAccount.address,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: tokenVault,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: tokenAccountOwnerPda,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: GOLD_TOKEN_MINT,
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: TOKEN_PROGRAM_ID,
        isWritable: false,
        isSigner: false,
      },
      {
        pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
        isWritable: false,
        isSigner: false,
      },
    ],
    data: Buffer.from(new Uint8Array([84, 206, 8, 255, 98, 163, 218, 19, 1])),
  });
}


async function prepareTx(ix) {
  let tx = new Transaction().add(ix);
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = payer.publicKey;  

  tx.partialSign(payer);

  tx = Transaction.from(
    tx.serialize({
      verifySignatures: false,
      requireAllSignatures: false,
    }),
  );
    
  const serializedTx = tx.serialize({
    verifySignatures: false,
    requireAllSignatures: false,
  });

  return serializedTx.toString('base64');
}
import { getRepository } from 'typeorm';
import { isUuid } from 'uuidv4';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionRepository = getRepository(Transaction);

    if (!isUuid(id)) {
      throw new AppError('Transaction not found.');
    }

    const transaction = await transactionRepository.findOne(id);

    if (!transaction) {
      throw new AppError('Transaction not found.');
    }

    transactionRepository.delete(id);
  }
}

export default DeleteTransactionService;

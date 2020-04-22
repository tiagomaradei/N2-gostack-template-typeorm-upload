import { getRepository, getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category_title: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category_title,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);
    const balance = await transactionsRepository.getBalance();

    const isValidTransaction = (): boolean => {
      if (type === 'outcome') {
        return balance.total - value >= 0;
      }

      return true;
    };

    if (!isValidTransaction()) {
      throw new AppError('You dont have founds for this transaction.');
    }

    const category = await categoryRepository.find({
      where: { title: category_title },
    });

    let category_id = '';

    if (!category[0]) {
      const newCategory = categoryRepository.create({
        title: category_title,
      });

      await categoryRepository.save(newCategory);
      category_id = newCategory.id;
    } else {
      category_id = category[0].id;
    }

    const transaction = transactionsRepository.create({
      title,
      category_id,
      type,
      value,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;

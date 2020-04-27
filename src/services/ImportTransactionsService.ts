import { getRepository, getCustomRepository } from 'typeorm';
import path from 'path';
import fs from 'fs';
import getStream from 'get-stream';
import parse from 'csv-parse';
import uploadConfig from '../config/upload';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface Request {
  fileName: string;
}

interface TransactionRequest {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute({ fileName }: Request): Promise<Transaction[]> {
    const filePath = path.join(uploadConfig.directory, fileName);
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);
    const transactions: Array<TransactionRequest> = [];
    const categories: string[] = [];

    const readCSVData = async (): Promise<any> => {
      const parseStream = parse({ delimiter: '\t' });
      const data = await getStream.array(
        fs.createReadStream(filePath).pipe(parseStream),
      );

      fs.unlinkSync(filePath);
      data.splice(0, 1);

      return data;
    };

    const csvData = await readCSVData();

    csvData.forEach(
      async (data: [string, 'income' | 'outcome', number, string]) => {
        const [title, type, value, category] = data;

        transactions.push({
          title,
          type,
          value,
          category,
        });

        categories.push(category);
      },
    );

    const addTransactions = await Promise.all(transactions);
    const existingCategories = await categoryRepository.find({});
    const existingCategoriesTitles = existingCategories.map(
      category => category.title,
    );

    const addCategories = categories
      .filter((category, index, self) => self.indexOf(category) === index)
      .filter(category => !existingCategoriesTitles.includes(category));

    const createdCategories = categoryRepository.create(
      addCategories.map(title => ({
        title,
      })),
    );

    await categoryRepository.save(createdCategories);

    const finalCategories = [...existingCategories, ...createdCategories];

    const createdTransactions = transactionsRepository.create(
      addTransactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    return createdTransactions;
  }
}

export default ImportTransactionsService;

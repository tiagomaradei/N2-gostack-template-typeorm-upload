import path from 'path';
import fs from 'fs';
import getStream from 'get-stream';
import parse from 'csv-parse';
import uploadConfig from '../config/upload';
import Transaction from '../models/Transaction';
import CreateTransactionService from './CreateTransactionService';

interface Request {
  fileName: string;
}

class ImportTransactionsService {
  async execute({ fileName }: Request): Promise<Transaction[]> {
    const filePath = path.join(uploadConfig.directory, fileName);
    const createTransaction = new CreateTransactionService();
    const transactions: Array<Promise<Transaction>> = [];

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
        const newTransaction = createTransaction.execute({
          title,
          type,
          value,
          category_title: category,
        });
        transactions.push(newTransaction);
      },
    );

    const createdTransactions = await Promise.all(transactions);

    return createdTransactions;
  }
}

export default ImportTransactionsService;

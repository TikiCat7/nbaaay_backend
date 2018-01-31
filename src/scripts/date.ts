import "reflect-metadata";
import { createConnection } from "typeorm";
import { Test } from '../entity/Test';


createConnection().then(async connection => {
  console.log('hi');
  const testRepository = await connection.getRepository(Test);
  let test = new Test();
  test.publishedAt = new Date();
  await testRepository.save(test);
  console.log('done');
});



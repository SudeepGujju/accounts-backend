const {
  BankTransactionModel,
  UserModel,
  TransactionModel,
  GroupModel,
  InvoiceModel,
  AccountModel,
} = require("../models");

const EventEmitter = require("events");
const mongoose = require("mongoose");

const TASK_USER_DATA_CLEANUP = "TASK_USER_DATA_CLEANUP";

const eventEmitter = new EventEmitter();

const userDataCleanUpListener = async (userId) => {
  try {
    if (!userId) {
      return;
    }

    // const session = await mongoose.startSession();

    try {
      let user = await UserModel.findById(userId).lean();

      console.log(`Cleanup of user started: ${user.username} ${user._id}`);

      if (!user.dataClean.bankTransaction) {
        //   session.startTransaction();

        const bank = await BankTransactionModel.deleteMany({
          userId: userId,
        }); //.session(session);

        await UserModel.findOneAndUpdate(
          { _id: userId },
          { "dataClean.bankTransaction": true }
        ); //.session(session);

        //   session.commitTransaction();
      }

      if (!user.dataClean.transaction) {
        //   session.startTransaction();

        const transactions = await TransactionModel.deleteMany({
          userId: userId,
        }); //.session(session);

        await UserModel.findOneAndUpdate(
          { _id: userId },
          { "dataClean.transaction": true }
        ); //.session(session);

        //   session.commitTransaction();
      }

      if (!user.dataClean.invoice) {
        //   session.startTransaction();

        const invoices = await InvoiceModel.deleteMany({
          userId: userId,
        }); //.session(session);

        await UserModel.findOneAndUpdate(
          { _id: userId },
          { "dataClean.invoice": true }
        ); //.session(session);

        //   session.commitTransaction();
      }

      if (!user.dataClean.account) {
        //   session.startTransaction();

        const accounts = await AccountModel.deleteMany({
          userId: userId,
        }); //.session(session);

        await UserModel.findOneAndUpdate(
          { _id: userId },
          { "dataClean.account": true }
        ); //.session(session);

        //   session.commitTransaction();
      }

      if (!user.dataClean.group) {
        //   session.startTransaction();

        const groups = await GroupModel.deleteMany({ userId: userId }); //.session(session);

        await UserModel.findOneAndUpdate(
          { _id: userId },
          { "dataClean.group": true }
        ); //.session(session);

        //   session.commitTransaction();
      }

      user = await UserModel.findById(userId); //.session(session);

      await user.delete();

    } catch (error) {
      console.error(error);

      // this will rollback any changes made in the database
      //   await session.abortTransaction();

      // rethrow the error
      throw error;
    } finally {
      // ending the session
      //   session.endSession();
    }
  } catch (error) {
    console.error(error);
  }
}

eventEmitter.on(TASK_USER_DATA_CLEANUP, userDataCleanUpListener);

const userDataCleanUp = (userId) => {
  eventEmitter.emit(TASK_USER_DATA_CLEANUP, userId);
};

process.on("SIGINT", function () {
  eventEmitter.off(TASK_USER_DATA_CLEANUP, userDataCleanUpListener);
});

module.exports.userDataCleanUp = userDataCleanUp;

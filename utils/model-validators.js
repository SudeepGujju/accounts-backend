module.exports.validateRefId = (model, id) => {

	return new Promise((resolve, reject) => {

		model.findOne({ _id: id }, function(err, result){

            if (result) {
				return resolve(true);
            }
			else return reject(new Error(`FK Constraint '${model.modelName}' for '${id.toString()}' failed`));
		});
	});
};

module.exports.validateRefFld = (userId, model, name, value) => {

	return new Promise((resolve, reject) => {

		model.findOne({ userId: userId, [name]: value }, function(err, result){

			if (result) {
				return resolve(true);
            }
			else{
				// return reject(new Error(`FK Constraint '${model.modelName}' for '${value.toString()}' failed`));
				return reject(new Error(`FK Constraint failed for value '${value.toString()}' in '${model.modelName}' collection.`));
			}
		});
	});
};
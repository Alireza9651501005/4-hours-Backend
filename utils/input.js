/**
 * for converting persian number to english number
 * @param {string} input
 */
exports.convertPersianNumberToEnglish = (input) => {
	const numbers = [
		{ per: "۰", eng: "0" },
		{ per: "۱", eng: "1" },
		{ per: "۲", eng: "2" },
		{ per: "۳", eng: "3" },
		{ per: "۴", eng: "4" },
		{ per: "۵", eng: "5" },
		{ per: "۶", eng: "6" },
		{ per: "۷", eng: "7" },
		{ per: "۸", eng: "8" },
		{ per: "۹", eng: "9" },
	];

	let finalInput = input;

	for (let i = 0; i < numbers.length; i++) {
		const reg = new RegExp(numbers[i].per, "g");
		finalInput = finalInput.replace(reg, numbers[i].eng);
	}
	return finalInput;
};

exports.filterBadWords = (input) => {
	let finalInput = input;
	const badWords = [
		"koon",
		"kon",
		"kir",
		"kos",
		"منی",
		"sex",
		"http",
		"سکس",
		"س.ک.س",
		"kiri",
		"kooni",
		"پرونده",
		"مـشـاوره",
		"فروشی",
		"مشاوره",
		"kuni",
		"کص",
		"کیر",
		"گیگ",
		"بلاک چین",
		"بلاکچین",
		"کیری",
		"کونی",
		"اوبی",
		"obi",
		"lashi",
		"koskesh",
		"کسکش",
		"کس کش",
		"kos kesh",
		"لاشی",
		"jende",
		"جنده",
		"کیون",
		"kion",
		"namal",
		"link",
		"بیوگرافیمو",
		"proxey",
		"شارژ",
		"پروکسی",
		"جشنواره",
		"نت",
		"خوشآمدید",
	];

	for (let i in badWords) {
		const badWord = badWords[i];
		const pattern = new RegExp(badWord, "gi");
		finalInput = finalInput.replace(pattern, "");
	}

	return finalInput;
};

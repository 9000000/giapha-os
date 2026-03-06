const { Lunar, Solar } = require("lunar-javascript");

// Test lunar conversion again
let s1 = Solar.fromYmd(2025, 4, 15); // Sinh nhật 15/4/2025 dương
console.log("Solar:", s1.toString());
console.log("Lunar from Solar:", s1.getLunar().toString(), " | Day:", s1.getLunar().getDay(), " | Month:", s1.getLunar().getMonth());

// Test the reverse
let l2 = Lunar.fromYmd(2025, 2, 28); // Giỗ 28/2/2025 âm
console.log("Lunar:", l2.toString());
console.log("Solar from Lunar:", l2.getSolar().toString(), " | Day:", l2.getSolar().getDay(), " | Month:", l2.getSolar().getMonth());

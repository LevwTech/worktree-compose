import chalk from "chalk";
export function info(msg) {
    console.log(chalk.blue("ℹ"), msg);
}
export function success(msg) {
    console.log(chalk.green("✔"), msg);
}
export function warn(msg) {
    console.log(chalk.yellow("⚠"), msg);
}
export function error(msg) {
    console.error(chalk.red("✖"), msg);
}
export function header(msg) {
    console.log(chalk.bold.cyan(`\n=== ${msg} ===`));
}

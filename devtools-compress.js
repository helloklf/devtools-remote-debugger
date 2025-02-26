const lzma = require('lzma');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { spawnSync } = require('child_process');

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const writeFile = promisify(fs.writeFile);

// 要压缩的目录
const inputDir = './devtools-frontend-classical';
// 输出的压缩文件
const outputFile = './devtools-frontend-classical/devtools_package'; 

// 递归读取目录中的所有文件
async function readDirectoryRecursive(dir) {
    let results = [];
    const list = await readdir(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const fileStat = await stat(filePath);
        if (fileStat && fileStat.isDirectory()) {
            results = results.concat(await readDirectoryRecursive(filePath));
        } else {
            results.push(filePath);
        }
    }
    return results;
}

// 压缩目录中的所有文件
async function compressDirectory(inputDir, outputFile) {
    try {
        const files = await readDirectoryRecursive(inputDir);
        let contents = '';

        const dic = [];
        for (const file of files) {
            if (
                file.endsWith('.js') ||
                file.endsWith('.json') ||
                file.endsWith('.css') ||
                file.endsWith('.svg')
            ) {
                const data = await readFile(file, 'utf-8');
                dic.push(['.' + file.substring(file.indexOf('/')), data.length]);
                contents += data;
            }
        }

        // 文件表信息
        const dicStr = JSON.stringify(dic);
        // 将固定8个字符长度 用于记录文件表的程度
        const mapHeadLen = `${dicStr.length}        `.substring(0, 8);
        // [长度信息][文件表][文件内容]
        const allData = mapHeadLen + dicStr + contents;

        // 优先使用lzma命令压缩，因为比js算法快太多了
        try {
            await writeFile(outputFile, allData);
            const result = spawnSync("lzma", ["-z", "-e", outputFile], { encoding: 'utf-8' });
            if (result.error) {
                throw result.error
            }
        } catch {
            // lzma命令不行再用lzma-c
            const compressedData = lzma.compress(allData, 9);
            await writeFile(outputFile + ".lzma", Buffer.from(compressedData));
        }

        console.log(`目录 ${inputDir} 已成功压缩到 ${outputFile}.lzma`);
    } catch (error) {
        console.error('压缩目录时出错:', error);
    }
}

compressDirectory(inputDir, outputFile);
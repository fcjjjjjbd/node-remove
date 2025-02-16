async function recursiveDelete(initialUrl, { headers: initialHeaders }) {
  const urlParams = new URL(initialUrl).searchParams;
  const commonParams = {
    appid: urlParams.get("appid") || "",
    provider: urlParams.get("provider") || "",
    spaceId: urlParams.get("spaceId") || "",
  };
  const rootFolder = urlParams.get("folder");

  async function makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          ...initialHeaders,
          "Content-Type": "application/json;charset=UTF-8",
          ...options.headers,
        },
        ...options,
      });
      return await response.json();
    } catch (error) {
      console.error(`请求错误:`, error.message);
      return null;
    }
  }

  function normalizePath(path) {
    return path.startsWith("/") ? path.slice(1) : path;
  }

  async function deleteFile(file, folderPath) {
    console.log(
      "{ 【 folderPath 】 }:>>>>>>>>>>>> createFold.js:32",
      folderPath
    );
    const normalizedPath = `${folderPath}${
      `/${folderPath}` === rootFolder ? "/" : ""
    }${file.name}`;
    console.log(`尝试删除文件: ${normalizedPath}`);

    const deleteResponse = await makeRequest(
      "https://unicloud-api.dcloud.net.cn/unicloud/api/host/delete-file",
      {
        method: "POST",
        body: JSON.stringify({
          ...commonParams,
          fileId: file.id,
          filePath: normalizedPath,
        }),
      }
    );

    if (deleteResponse?.ret === 0) {
      console.log(`成功删除文件: ${normalizedPath}`);
      return true;
    }
    console.error(
      `删除文件失败: ${normalizedPath}，错误信息：${deleteResponse}`
    );
    return false;
  }

  async function processFolder(folderUrl) {
    console.log(`处理文件夹: ${folderUrl}`);
    const listResponse = await makeRequest(folderUrl);

    if (!listResponse || listResponse.ret !== 0) {
      console.error(`无法列出文件夹内容: ${folderUrl}`);
      return false;
    }

    const { directories, files } = listResponse.data;
    const currentFolder = normalizePath(
      new URL(folderUrl).searchParams.get("folder")
    );

    console.log(
      `文件夹 ${currentFolder} 包含 ${files.length} 个文件和 ${directories.length} 个子文件夹`
    );

    await Promise.all(files.map((file) => deleteFile(file, currentFolder)));

    await Promise.all(
      directories.map((dir) =>
        processFolder(
          folderUrl.replace(
            /folder=[^&]+/,
            `folder=${encodeURIComponent(dir.prefix)}`
          )
        )
      )
    );

    await deleteFolderAttempt(currentFolder);
  }

  async function deleteFolderAttempt(folderPath) {
    const normalizedPath = normalizePath(folderPath);
    console.log(`尝试删除文件夹: ${normalizedPath}`);

    const deleteResponse = await makeRequest(
      "https://unicloud-api.dcloud.net.cn/unicloud/api/host/delete-directory",
      {
        method: "POST",
        body: JSON.stringify({ ...commonParams, folder: normalizedPath }),
      }
    );

    if (deleteResponse && deleteResponse.ret === 0) {
      console.log(`成功删除文件夹: ${normalizedPath}`);
    } else {
      console.log(
        `无法删除文件夹: ${normalizedPath}，错误信息：${deleteResponse}`
      );
    }
  }

  await processFolder(initialUrl);
  console.log("递归删除过程完成");
}

recursiveDelete(
  "https://unicloud-api.dcloud.net.cn/unicloud/api/host/file-list?appid=&provider=alipay&spaceId=env-00jxhg31g17i&end_at=2024-11-30+23:59:59&page=0&pageSize=100&marker=&folder=%2Fmoney%2Fassets",
  {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "zh-CN,zh;q=0.9",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      token: "3b263ad7dbf4c7d6ff31306aa7f271d3",
    },
    referrer: "https://unicloud.dcloud.net.cn/",
    referrerPolicy: "strict-origin-when-cross-origin",
    body: null,
    method: "GET",
    mode: "cors",
    credentials: "include",
  }
);

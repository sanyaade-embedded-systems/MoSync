/*
File: filetest.js
Auhthor: Mikael Kindborg

Test script for PhoneGap File API.
*/

/**
 * For debugging.
 */
function MyLog(s)
{
	console.log(s);
}

/**
 * For debugging.
 */
function PrintObject(obj, indent)
{
	if (undefined === indent)
	{
		indent = "";
	}

	MyLog(indent + "@@ PrintObject");

	for (var field in obj)
	{
		if (typeof obj[field] != "function")
		{
			MyLog("  " + indent + "[" + field + ": " + obj[field] + "]");
			if ((null != obj[field]) && (typeof obj[field] == "object"))
			{
				PrintObject(obj[field], indent + "  ");
			}
		}
	}
}

/**
 * Wrapper around the PhoneGap File API.
 * The intention is to simplify the File API.
 * All functions take one callback function,
 * rather than two functions (success and fail)
 * as in the PhoneGap API. The first parameter of
 * the callback is always a boolean that indicates
 * if the call was successful or not. The result
 * is passed in an optional second parameter.
 */
var FileSys = function()
{
	var FileSys = {};

	/**
	 * The file system object is returned to funcion fun.
	 * @param uri "LocalFileSystem" for the local file
	 * system or a uri in the form "file://...", for
	 * example "file:///sdcard".
	 * @param fun A function on the form fun(success, fileSys)
	 */
	FileSys.create = function(uri, fun)
	{
		var fileSys = FileSys.createInstance();

		if ("LocalFileSystem" == uri)
		{
			window.requestFileSystem(
				LocalFileSystem.PERSISTENT,
				0,
				function (fileSystem)
				{
					fileSys.root = fileSystem.root;
					fun(true, fileSys);
				},
				function ()
				{
					fileSys.root = null;
					fun(false, null);
				});
		}
		else
		{
			window.resolveLocalFileSystemURI(
				uri,
				function (directoryEntry)
				{
					console.log("@@@ resolveLocalFileSystemURI success");
					fileSys.root = directoryEntry;
					fun(true, fileSys);
				},
				function ()
				{
					console.log("@@@ resolveLocalFileSystemURI error");
					fileSys.root = null;
					fun(false, null);
				});
			// TODO: File system URIs not implemeted.
			fun(false, null);
		}
	};

	FileSys.createInstance = function()
	{
		var fileSys = {};

		fileSys.root = null;

		/**
		 * Make generic error handling function that calls
		 * the specified function.
		 */
		function error(fun, id)
		{
			return function(result)
			{
				MyLog("FileSys.error: " + result.code);
				if (id)
				{
					MyLog("error id: " + id);
				}
				fun(false, null);
			};
		}

		fileSys.writeText = function(path, data, fun)
		{
			fileSys.writeTextAtPosition(path, data, 0, fun);
		};

		/**
		 * Write at the specified position (offset) in the file.
		 * TODO: This does not seem to work. Seek seems to be broken
		 * in PhoneGap. Truncates the file.
		 */
		fileSys.writeTextAtPosition = function(path, data, position, fun)
		{
			fileSys.root.getFile(
				path,
				{ create: true, exclusive: false },
				function(fileEntry)
				{
					var writer = new FileWriter(fileEntry);
					writer.onwrite = function(obj)
					{
						fun(true);
					};
					writer.error = function(obj)
					{
						fun(false);
					};
					writer.seek(position);
					writer.write(data);
				},
				error(fun));
		};

		fileSys.readText = function(path, fun)
		{
			fileSys.root.getFile(
				path,
				{ create: false, exclusive: false },
				function(fileEntry)
				{
					var reader = new FileReader();
					reader.onload = function(obj)
					{
						fun(true, obj.target.result);
					};
					reader.onerror = function(obj)
					{
						 fun(false, null);
					};
					reader.readAsText(fileEntry);
				},
				error(fun));
		};

		fileSys.readAsDataURL = function(path, fun)
		{
			fileSys.root.getFile(
				path,
				{ create: false, exclusive: false },
				function(fileEntry)
				{
					var reader = new FileReader();
					reader.onload = function(obj)
					{
						fun(true, obj.target.result);
					};
					reader.onerror = function(obj)
					{
						 fun(false, null);
					};
					reader.readAsDataURL(fileEntry);
				},
				error(fun));
		};

		fileSys.truncate = function(path, size, fun)
		{
			fileSys.root.getFile(
				path,
				{ create: false, exclusive: false },
				function(fileEntry)
				{
					var writer = new FileWriter(fileEntry);
					writer.onwrite = function(obj)
					{
						fun(true);
					};
					writer.error = function(obj)
					{
						fun(false);
					};
					writer.truncate(size);
				},
				error(fun));
		};

		fileSys.getMetaData = function(path, fun)
		{
			fileSys.root.getFile(
				path,
				{ create: false, exclusive: false },
				function(fileEntry)
				{
					fileEntry.getMetadata(
						function(metadata) { fun(true, metadata); },
						error(fun));
				},
				error(fun));
		};

		/**
		 * Copy of move a file from a source path to a
		 * destination path.
		 * @param path Full source path.
		 * @param newPath Full destination path.
		 * @param move true if the file should be moved,
		 * false if it should be copied.
		 */
		fileSys.copyOrMove = function(path, newPath, fun, move)
		{
			fileSys.root.getFile(
				path,
				{ create: false, exclusive: false },
				function(fileEntry)
				{
					var uri = fileEntry.toURI();
					console.log("################# uri: " + uri);

					// Full parent directory path of new file destination,
					// excluding the file name.
					var newParentPath;

					// New file name.
					var newFileName;

					// The new full path name.
					var newFullPath = fileSystem.root.fullPath + "/" + newPath;

					// Split into parent path and file name if the file
					// is not at the root of the local file system.
					var index = newFullPath.lastIndexOf("/");
					if (index > -1)
					{
						newParentPath = newFullPath.substring(0, index);
						newFileName = newFullPath.substring(index + 1);

						MyLog("copyOrMoveFile newParentPath: " + newParentPath);
						MyLog("copyOrMoveFile newFileName: " + newFileName);
					}
					else
					{
						// Path name is invalid.
						error(fun);
					}

					// Find destination directory name.
					// TODO: This will break if file is at the
					// root of the file system.
					var directoryName = "";
					index = newParentPath.lastIndexOf("/");
					if (index > -1)
					{
						directoryName = newParentPath.substring(index + 1);
						MyLog("copyOrMoveFile directoryName: " + directoryName);
					}

					// Create destination directory object.
					var parentDirectory = new DirectoryEntry();
					parentDirectory.fullPath = newParentPath;
					parentDirectory.name = directoryName;

					if (move)
					{
						fileEntry.moveTo(
							parentDirectory,
							newFileName,
							function(result) {
								PrintObject(result);
								fun(true, result); },
							error(fun));
					}
					else
					{
						fileEntry.copyTo(
							parentDirectory,
							newFileName,
							function(result) {
								PrintObject(result);
								fun(true, result); },
							error(fun));
					}
				},
				error(fun));
		};

		fileSys.copy = function(path, newPath, fun)
		{
			return fileSys.copyOrMove(path, newPath, fun, false);
		};

		fileSys.move = function(path, newPath, fun)
		{
			return fileSys.copyOrMove(path, newPath, fun, true);
		};

		/**
		 * Create a file.
		 * @param path File path relative to the
		 * file system root.
		 * @fun Function that is called with the result.
		 */
		fileSys.createFile = function(path, fun)
		{
			fileSys.root.getFile(
				path,
				{ create: true, exclusive: false },
				function(entry) { fun(true, entry); },
				error(fun));
		};

		fileSys.deleteFile = function(path, fun)
		{
			fileSys.root.getFile(
				path,
				{ create: false, exclusive: false },
				function(fileEntry)
				{
					fileEntry.remove(
						function(fileEntry) { fun(true, fileEntry); },
						error(fun));
				},
				error(fun));
		};

		/**
		 * Create a directory.
		 * @param path Directory path relative to the
		 * file system root.
		 * @fun Function that is called with the result.
		 */
		fileSys.createDirectory = function(path, fun)
		{
			fileSys.root.getDirectory(
				path,
				{ create: true, exclusive: false },
				function(entry) { fun(true, entry); },
				error(fun));
		};

		fileSys.deleteDirectory = function(path, fun)
		{
			var fullPath = fileSys.root.fullPath + "/" + path;

			// Find directory name.
			var directoryName = "";
			var index = fullPath.lastIndexOf("/");
			if (index > -1)
			{
				directoryName = fullPath.substring(index + 1);
				MyLog("deleteDirectory directoryName: " + directoryName);
			}

			// Create destination directory object.
			var directory = new DirectoryEntry();
			directory.fullPath = fullPath;
			directory.name = directoryName;

			directory.removeRecursively(
				function(entry) { fun(true, entry); },
				error(fun));
		};

		fileSys.readDirectory = function(path, fun)
		{
			fileSys.root.getDirectory(
				path,
				{ create: false, exclusive: false },
				function(directory)
				{
					var directoryReader = directory.createReader();
					directoryReader.readEntries(
						function(entries) { fun(true, entries); },
						error(fun));
				},
				error(fun));
		};

		return fileSys;
	};

	return FileSys;
}();

/**
 * Function that does some tests of the file system API.
 * Uses the above helper library.
 */
function testFileSystem()
{
	/**
	 * A file system object, created last
	 * in this function.
	 */
	var fileSys;

	/**
	 * Array of test functions. Created below.
	 */
	var tests;

	/**
	 * Position of current test in the array of
	 * test functions.
	 */
	var testIndex = 0;

	/**
	 * @return The next test function. Increments
	 * the testIndex.
	 */
	function nextTest()
	{
		if (testIndex < tests.length)
		{
			++testIndex;
			return tests[testIndex - 1];
		}
		else
		{
			return function()
			{
				MyLog("End of tests");
				alert("End of tests");
			};
		}
	}

	/**
	 * Calls the next test function with
	 * a boolean success value.
	 */
	function runNextTest(success)
	{
		MyLog("Running next test");
		nextTest()(success);
	}

	// Create the test suite.
	tests = [
	    // Set up initial file structure.
		createFiles,
		// Do tests on directories.
		readDirectory("foa", checkDirectoryContents),
		copyDirectory("foa", "fob"),
		readDirectory("fob", checkDirectoryContents),
		moveDirectory("fob", "foc"),
		readDirectory("foc", checkDirectoryContents),
		// Check file contents.
		readFile("foo/hello1.txt", "Hello World"),
		readFile("foo/bar/hello2.txt", "Hello World"),
		readFile("foo/bar/hello3.txt", "Hello World"),
		// Write new file.
		writeFile("foc/bar/test.txt", "Hello World"),
		readFile("foc/bar/test.txt", "Hello World"),
		// Overwrite existing file.
		writeFile("foc/bar/test.txt", "Hello World 2"),
		readFile("foc/bar/test.txt", "Hello World 2"),
		// File tests.
		truncateFile("foc/bar/test.txt", 5, "Hello"),
		copyFile("foc/bar/test.txt", "foc/bar/test2.txt"),
		readFile("foc/bar/test2.txt", "Hello"),
		moveFile("foc/bar/test2.txt", "foc/bar/test3.txt"),
		fileShouldNotExist("foc/bar/test2.txt"),
		readFile("foc/bar/test3.txt", "Hello"),
		deleteFile("foc/bar/test3.txt"),
		fileShouldNotExist("foc/bar/test3.txt"),
		// Delete directories.
		deleteFiles,
		fileShouldNotExist("foo/hello1.txt"),
		fileShouldNotExist("foo/bar/hello2.txt"),
		fileShouldNotExist("foo/bar/hello3.txt"),
		allTestsPassed()
	];

	// Set up test state.
	function createFiles(success)
	{
		if (success)
		{
			// Create directories and some empty files.
			fileSys.createDirectory("foa", createFilesShouldPass);
			fileSys.createDirectory("foa/bar", createFilesShouldPass);
			fileSys.createFile("foa/hello.txt", createFilesShouldPass);
			fileSys.createFile("foa/bar/hello.txt", createFilesShouldPass);
			fileSys.createDirectory("foo", createFilesShouldPass);
			fileSys.createDirectory("foo/bar", createFilesShouldPass);

			// Write files to directories.
			fileSys.writeText("foo/hello1.txt", "Hello World", createFilesShouldPass);
			fileSys.writeText("foo/bar/hello2.txt", "Hello World", createFilesShouldPass);
			fileSys.writeText("foo/bar/hello3.txt", "Hello World", createFilesDone);
		}
	}

	// Clean up.
	function deleteFiles(success)
	{
		if (success)
		{
			// Create directories and some empty files.
			fileSys.deleteDirectory("foc", deleteFilesShouldPass);
			fileSys.deleteDirectory("foo/bar", deleteFilesShouldPass);
			fileSys.deleteDirectory("foo", deleteFilesShouldPass);
		}
	}

	function createFilesShouldPass(success)
	{
		if (!success)
		{
			fail("createFiles failed");
		}
	}

	function deleteFilesShouldPass(success)
	{
		if (!success)
		{
			fail("deleteFiles failed");
		}
	}

	/**
	 * Run next test.
	 */
	function createFilesDone(success)
	{
		if (success)
		{
			runNextTest(success);
		}
		else
		{
			fail("createFilesDone failed");
		}
	}

	function readDirectory(path, checkFun)
	{
		return function(success)
		{
			if (success)
			{
				fileSys.readDirectory(
					path,
					readDirectoryDone(path, checkFun));
			}
			else
			{
				fail("readDirectory failed " + path);
			}
		};
	}

	/**
	 * Check that directory contents are as expected.
	 */
	function readDirectoryDone(path, checkFun)
	{
		return function(success, files)
		{
			if (success && checkFun(files))
			{
				runNextTest(success);
			}
			else
			{
				fail("readDirectoryDone failed: " + path);
			}
		};
	}

	function copyDirectory(sourcePath, destPath)
	{
		return function(success)
		{
			if (success)
			{
				fileSys.copy(
					sourcePath,
					destPath,
					copyDirectoryDone(destPath));
			}
			else
			{
				fail("testCopyDirectory failed: " +
					sourcePath + " " + destPath);
			}
		};
	}

	function copyDirectoryDone(destPath)
	{
		return function(success)
		{
			if (success)
			{
				runNextTest(success);
			}
			else
			{
				fail("copyDirectoryDone failed " + destPath);
			}
		};
	}

	function moveDirectory(sourcePath, destPath)
	{
		return function(success)
		{
			if (success)
			{
				fileSys.move(
					sourcePath,
					destPath,
					moveDirectoryDone(destPath));
			}
			else
			{
				fail("moveDirectory failed: " +
					sourcePath + " " + destPath);
			}
		};
	}

	function moveDirectoryDone(destPath)
	{
		return function(success)
		{
			if (success)
			{
				runNextTest(success);
			}
			else
			{
				fail("moveDirectoryDone failed " + destPath);
			}
		};
	}

	function writeFile(path, data)
	{
		return function(success)
		{
			if (success)
			{
				fileSys.writeText(path, data, runNextTest);
			}
			else
			{
				fail("writeFile failed " + path);
			}
		};
	}

	function readFile(path, expectedData)
	{
		return function(success)
		{
			if (success)
			{
				fileSys.readText(path, readFileDone(expectedData));
			}
			else
			{
				fail("readFile failed " + path);
			}
		};
	}

	function readFileDone(expectedData)
	{
		return function(success, data)
		{
			if (success)
			{
				if (data == expectedData)
				{
					runNextTest(success);
					return;
				}
			}

			fail("readFileDone failed " + path);
		};
	}

	function truncateFile(path, newSize, expectedData)
	{
		return function(success)
		{
			if (success)
			{
				fileSys.truncate(path, newSize, truncateFileDone(expectedData));
			}
			else
			{
				fail("truncateFile failed " + path);
			}
		};
	}

	function truncateFileDone(expectedData)
	{
		return function(success)
		{
			if (success)
			{
				readFile(path, expectedData)(success);
			}
			else
			{
				fail("truncateFileDone failed " + path);
			}
		};
	}

	function copyFile(sourcePath, destPath)
	{
		return function(success)
		{
			if (success)
			{
				fileSys.copy(sourcePath, destPath, copyFileDone));
			}
			else
			{
				fail("copyFile failed " + path);
			}
		};
	}

	function copyFileDone(success)
	{
		if (success)
		{
			runNextTest(success);
		}
		else
		{
			fail("copyFileDone failed " + path);
		}
	}

	function moveFile(sourcePath, destPath)
	{
		return function(success)
		{
			if (success)
			{
				fileSys.move(sourcePath, destPath, moveFileDone));
			}
			else
			{
				fail("moveFile failed " + path);
			}
		};
	}

	function moveFileDone(success)
	{
		if (success)
		{
			runNextTest(success);
		}
		else
		{
			fail("moveFileDone failed " + path);
		}
	}

	function deleteFile(path)
	{
		return function(success)
		{
			if (success)
			{
				fileSys.deleteFile(path, deleteFileDone);
			}
			else
			{
				fail("deleteFile failed " + path);
			}
		};
	}

	function deleteFileDone(success)
	{
		if (success)
		{
			runNextTest(success);
		}
		else
		{
			fail("deleteFileDone failed " + path);
		}
	}

	function fileShouldNotExist(path)
	{
		// TODO: Implement.
	}

	function allTestsPassed()
	{
		return function(success)
		{
			MyLog("All tests passed: " + success);
			alert("All tests passed: " + success);
		};
	}

	function checkDirectoryContents(files)
	{
		var passed = 0;

		for (var i = 0; i < files.length; ++i)
		{
			var entry = files[i];
			if (entry.name == "hello.txt" && entry.isFile && !entry.isDirectory)
			{
				++passed;
			}
			if (entry.name == "bar" && !entry.isFile && entry.isDirectory)
			{
				++passed;
			}
			else
			{
				// Should not happen.
				passed = 0;
				break;
			}
		}

		return (passed == 2);
	}

	function fail(message)
	{
		MyLog("FileSystem test failed: " + message);
		alert("FileSystem test failed: " + message);
	}

	// Create the file system object and start test.
	FileSys.create(
		"file:///sdcard",
		function(success, fs)
		{
			if (success)
			{
				fileSys = fs;

				// Start first test.
				runNextTest(success);
			}
		});
}

/*

	function fileReadAsDataURL(success, url)
	{
		MyLog("@@@@@ FileReadAsDataURL result: " + success);

		if (success)
		{
			MyLog("@@@@@ FileReadAsDataURL url: " + url);
			var i = url.indexOf(",");
			var data = url.substring(i + 1);
			MyLog("@@@@@ FileReadAsDataURL data: " + data);
			var decodedData = atob(data);
			MyLog("@@@@@ FileReadAsDataURL decodedData: " + decodedData);

			// Next test.
			FileSys.getMetaData("hello2.txt", fileMetaData);
		}
	}
*/

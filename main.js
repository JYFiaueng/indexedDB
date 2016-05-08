var db,
	arrayKey = [],
	openRequest,
	lastCursor = 0,
	flag = 0,
	indexedDB = window.indexedDB  || window.mozIndexedDB || window.msIndexedDB || window.webkitIndexedDB,
	dbName = "person",
	tableName = "testTable";
window.addEventListener("DOMContentLoaded", init, false);
// window.addEventListener("load", init, false);

function init(){
	//打开或新建person数据库
	openRequest = indexedDB.open(dbName);
	//在新的数据库被创建或数据库的版本号被更改时触发
	openRequest.onupgradeneeded = function(e){
		console.log("running onupgradeneeded");
		var thisDb = e.target.result;//IDBDatabase
		console.log(thisDb.version);
		//thisDb.objectStoreNames是一个object DOMStringList
		//检查数据库里面是否有testTable这张表
		if(!thisDb.objectStoreNames.contains(tableName)){
			console.log("I need to create the objectstore");
			//autoIncrement表示主键的类型，自增的话设为true
			var objectStore = thisDb.createObjectStore(tableName, {keyPath:"phone"});//autoIncrement: true
			objectStore.createIndex("name", "name", {unique : false});
			//指定哪些字段是索引字段，unique为false表示字段不是唯一的
			objectStore.createIndex("phone", "phone", {unique : false});
		}
	};
	openRequest.onsuccess = function(e){
		db = e.target.result;
		console.log(db.version);
		db.onversionchange = function(){
			// alert("数据库在其他地方被修改，需要立即关闭");
			db.close();
		};
		db.onerror = function(event){
			// alert("Database error:"+event.target.errorCode);
			console.dir(event.target);
		};
		//如果testTable已经建立
		if(db.objectStoreNames.contains(tableName)){
			console.log("contains table "+tableName);
			//建立一个可读写的事务，因为对表的操作都要通过事务来完成
			var transaction = db.transaction([tableName], "readwrite");
			//整个事务都完成
			transaction.oncomplete = function(event){
				console.log("All done!");
			};
			//整个事务都失败
			transaction.onerror = function(event){
				console.dir(event);
			};
			//使用事务访问testTable，objectStore可以使事务访问特定的存储空间
			var objectStore = transaction.objectStore(tableName);
			//在存储空间上创建游标
			objectStore.openCursor().onsuccess = function(event){
				var cursor = event.target.result;//取得存储空间中的下一个对象
				if(cursor){
					console.log(cursor.key);
					console.dir(cursor.value);
					render({key:cursor.key,
							name:cursor.value["name"],
							phone:cursor.value["phone"], 
							address:cursor.value["address"]
						});
					cursor.continue();
					lastCursor++;
				}else{
					console.log("Done width cursor");
				}
			};
			objectStore.openCursor().onerror = function(event){
				console.dir(event);
			};
		}
	};
	openRequest.onerror = function(e){
		alert("数据建立请求错误:"+e.target.errorCode);
	};
}
function render(opt){
	var content = document.getElementById("content");
	var ul = document.createElement("ul");
	var sc = document.createElement("li");
	ul.setAttribute("id", opt.key);
	ul.setAttribute("data-phone", opt.phone);
	sc.innerHTML = '<input type="button" value="删除" id=#'+opt.key+'>';
	//为删除按钮添加一个id属性，便于后面的删除
	for(var k in opt){
		var li = document.createElement("li");
		li.innerHTML = opt[k];
		ul.appendChild(li);
	}
	ul.appendChild(sc);
	content.appendChild(ul);
}
//使用事件委托为记录的删除按钮添加事件
document.querySelector("#content").addEventListener("click", function(event){
	var target = event.target;
	// alert(target.value);
	if(target.value !== "删除"){
		return;
	}
	if(confirm("确定删除？")){
		deleteRecord(target.getAttribute("id"));
	}
});
//传入一个id值将对应的记录删除
function deleteRecord(id){
	var ul = document.getElementById(id.substring(1));
	var transaction = db.transaction([tableName], "readwrite");
	transaction.oncomplete = function(event){
		console.log("transaction complete!");
	};
	transaction.onerror = function(event){
		console.dir(event);
	};
	var objectStore = transaction.objectStore(tableName),
		getRequest = objectStore.get(ul.getAttribute("data-phone"));//先查找有没有要删除的键值
	getRequest.onsuccess = function(event){
		var result = event.target.result;
		console.log(result);
	};
	getRequest.onerror = function(event){
		console.log("没有找到要删除的键值");
	};
	//删除指定键值的数据
	ul.style.display = "none";
	var request = objectStore.delete(ul.getAttribute("data-phone"));
	request.onsuccess = function(e){
		console.log("success delete record!");
	};
	request.onerror = function(e){
		console.log("Error delete record:"+e);
	};
}
//添加记录
document.querySelector("#add").addEventListener("click", function(){
	var name = document.querySelector("#name").value,
		phone = document.querySelector("#phone").value,
		address = document.querySelector("#address").value,
		person = {"name":name, "phone":phone, "address":address},
		transaction = db.transaction([tableName], "readwrite");
	if(name === "" || phone === ""){
		alert("必须输入姓名和电话");
		return;
	}
	transaction.oncomplete = function(event){
		console.log("transaction complete");
		document.querySelector("#name").value = "";
		document.querySelector("#phone").value = "";
		document.querySelector("#address").value = "";
		// alert(lastCursor);
		// alert(flag);
	};
	transaction.onerror = function(event){
		console.dir(event);
	};
	var objectStore = transaction.objectStore(tableName);
	var r = objectStore.add(person);
	r.onerror = function(){
		alert("添加了重复的电话");
		document.querySelector("#phone").value = "";
		document.querySelector("#phone").focus();
	};
	r.onsuccess = function(){
		objectStore.openCursor().onsuccess = function(event){
			var cursor = event.target.result;//取得存储空间的下一个对象
			if(cursor){
				// alert(cursor.key);
				//用flag来标志新添加的项
				if(flag === lastCursor){
					render({key:cursor.key, name:name, phone:phone, address:address});
					lastCursor++;
					flag = 0;
				}else{
					flag++;
				}
				cursor.continue();
			}
			console.dir(person);
		};
	};
});
//删除DB
document.querySelector("#deleteDB").addEventListener("click", function(){
	var deleteDB = indexedDB.deleteDatabase(dbName);
	var content = document.querySelector("#content");
	while(content.firstChild){
		content.removeChild(content.firstChild);
	}
	deleteDB.onsuccess = function(event){
		console.log("success delete database!");
	};
	deleteDB.onerror = function(event){
		console.dir(event.target);
	};
});
//查询
document.querySelector("#selectBtn").addEventListener("click", function(){
	var curName = document.getElementById("selname").value;
	var transaction = db.transaction([tableName], "readwrite");
	if(curName === ""){
		alert("请输入姓名");
	}
	transaction.oncomplete = function(event){
		console.log("transaction complete");
	};
	transaction.onerror = function(event){
		console.dir(event);
	};
	var objectStore = transaction.objectStore(tableName);
	var boundKeyRange = IDBKeyRange.only(curName);
	document.getElementById("content").innerHTML = "";//清空content
	objectStore.index("name").openCursor(boundKeyRange).onsuccess = function(event){
		var cursor = event.target.result;
		if(!cursor){
			return;
		}
		var rowDate = cursor.value;
		console.log(rowDate);
		render({key:cursor.key,
				name:cursor.value["name"],
				phone:cursor.value["phone"],
				address:cursor.value["address"]
			});
		cursor.continue();
	};
});
document.querySelector("#selectBtn1").addEventListener("click", function(){
	var curName = document.getElementById("selphone").value;
	var transaction = db.transaction([tableName], "readwrite");
	if(curName === ""){
		alert("请输入电话");
	}
	transaction.oncomplete = function(event){
		console.log("transaction complete");
	};
	transaction.onerror = function(event){
		console.dir(event);
	};
	var objectStore = transaction.objectStore(tableName);
	var boundKeyRange = IDBKeyRange.only(curName);
	document.getElementById("content").innerHTML = "";//清空content
	objectStore.index("phone").openCursor(boundKeyRange).onsuccess = function(event){
		var cursor = event.target.result;
		if(!cursor){
			return;
		}
		var rowDate = cursor.value;
		console.log(rowDate);
		render({key:cursor.key,
				name:cursor.value["name"],
				phone:cursor.value["phone"],
				address:cursor.value["address"]
			});
		cursor.continue();
	};
});
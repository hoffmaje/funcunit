steal.then(function() {
	
	FuncUnit.support.readystate = "readyState" in document;
	//don't do any of this if in rhino (IE selenium)
	if (navigator.userAgent.match(/Rhino/)) {
		return;	
	}
	
	
	FuncUnit._window = null;
	// are we waiting on a new page ....
	var newPage = true, 
		reloading = false,
		changing;
	var makeArray = function(arr, win){
		if(!win){
			win = window;
		}
		var narr = win.Array();
		for (var i = 0; i < arr.length; i++) {
			narr.push(arr[i])
		}
		return narr;
	};
	
	
	FuncUnit._open = function(url){
		changing = url;
		
		var checkReload = function(url){
			if(FuncUnit._window.location.pathname == url ||
				FuncUnit._window.href == url){
				return true;
			}
			return false;
		}
		// if the first time ..
		if (newPage) {
			if(FuncUnit.frame){
				FuncUnit._window = FuncUnit.frame.contentWindow;
				reloading = checkReload(url);
				FuncUnit._window.location = url;
			}else{
				// open the new page ....
				FuncUnit._window = window.open(url, "funcunit");
			}
		}
		// otherwise, change the frame's url
		else {
			
			reloading = checkReload(url);
			FuncUnit._window.location = url;
		}
		
	}
	var unloadLoader, 
		loadSuccess, 
		firstLoad = true,
		currentDocument,
		onload = function(){
			FuncUnit._window.document.documentElement.tabIndex = 0;
			setTimeout(function(){
				FuncUnit._window.focus();
				var ls = loadSuccess
				loadSuccess = null;
				if (ls) {
					ls();
				}
			}, 0);
			Syn.unbind(FuncUnit._window, "load", onload);
		},
		onunload = function(){
			removeListeners();
			setTimeout(unloadLoader, 0)
			
		},
		removeListeners = function(){
			Syn.unbind(FuncUnit._window, "unload", onunload);
			Syn.unbind(FuncUnit._window, "load", onload);
		}
	unloadLoader = function(){
		if(!firstLoad) // dont remove the first run, fixes issue in FF 3.6
			removeListeners();
		
		Syn.bind(FuncUnit._window, "load", onload);
		
		//listen for unload to re-attach
		Syn.bind(FuncUnit._window, "unload", onunload)
	}
	
	//check for window location change, documentChange, then readyState complete -> fire load if you have one
	var newDocument = false, 
		poller = function(){
			if(FuncUnit._window.document  == null){
				return
			}
			
			if (FuncUnit._window.document !== currentDocument || newDocument) { //we have a new document
				currentDocument = FuncUnit._window.document;
	            newDocument = true;
				if (FuncUnit._window.document.readyState == "complete" && FuncUnit._window.location.href!="about:blank" && !reloading) {
					var ls = loadSuccess;
						loadSuccess = null;
					if (ls) {
						FuncUnit._window.focus();
						FuncUnit._window.document.documentElement.tabIndex = 0;
						
						ls();
					}
					
				}
			}
			
			// TODO need a better way to determine if a reloaded frame is loaded (like clearing the frame), this might be brittle 
			reloading = false;
			// checks every second ...
			setTimeout(arguments.callee, 500)
		}
	
	/*
	 * @hide
	 * Takes success and error to callback on next load ...
	 */
	FuncUnit._onload = function(success, error){
		// saver reference to success
		loadSuccess = function(){
			// called when load happens ... here we check for steal
			console.log(FuncUnit._window.steal)
			if(!FuncUnit._window.steal || FuncUnit._window.steal.isReady){
				success();
			}else{
				console.log('waiting for steal ...');
				setTimeout(arguments.callee, 200)
			}
				
		}
		
		
		// we only need to do this setup stuff once ...
		if (!newPage) {
			return;
		}
		newPage = false;
		
		if (FuncUnit.support.readystate)
		{
			poller();
		}
		else {
			unloadLoader();
		}
		
	}
	var confirms = [], prompts = [];
	FuncUnit.confirm = function(answer){
		confirms.push(!!answer)
	}
	FuncUnit.prompt = function(answer){
		prompts.push(answer)
	}
	FuncUnit._opened = function(){
		FuncUnit._window.alert = function(){}
		FuncUnit._window.confirm = function(){
			var res = confirms.shift();
			return res;
		}
		FuncUnit._window.prompt = function(){
			return prompts.shift();
		}
	}
	FuncUnit.$ = function(selector, context, method){
	
		var args = makeArray(arguments);
		for (var i = 0; i < args.length; i++) {
			args[i] = args[i] === FuncUnit.window ? FuncUnit._window : args[i]
		}
		
		var selector = args.shift(), 
			context = args.shift(), 
			method = args.shift(), 
			q;
		
		//convert context	
		if (context == FuncUnit.window.document) {
			context = FuncUnit._window.document
		}else if(context === FuncUnit.window){
			context = FuncUnit._window;
		}else if (typeof context == "number" || typeof context == "string") {
			context = FuncUnit._window.frames[context].document;
		}
		if (selector == FuncUnit.window.document) {
			selector = FuncUnit._window.document
		}else if(selector === FuncUnit.window){
			selector = FuncUnit._window;
		}
	
		// for trigger, we have to use the page's jquery because it uses jQuery's event system, which uses .data() in the page
		if (FuncUnit._window.jQuery && method == 'trigger') {
			args = makeArray(args, FuncUnit._window)
			q = FuncUnit._window.jQuery(selector, context)
		} else {
			q = FuncUnit.jquery(selector, context);
		}
		return q[method].apply(q, args);
		
		
	}
	
	FuncUnit.eval = function(str){
		return FuncUnit._window.eval(str)
	}
	
	FuncUnit.jquery(window).unload(function(){
		if (FuncUnit._window) 
			FuncUnit._window.close();
	})
	
});

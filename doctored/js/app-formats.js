/*globals doctored, console, alert*/
(function(){
    "use strict";

    var relaxng = {
            cache_useful_stuff_from_schema: function(){
                var this_function   = doctored.util.this_function,
                    schema_elements,
                    schema_element,
                    schema_element_help,
                    node_attribute_name,
                    block_or_inline,
                    i;

                this.elements = {};
                this.schema_elements = {}; //cache some lookups
                schema_elements = $("element", this.schema.documentElement);
                for(i = 0; i < schema_elements.length; i++){
                    schema_element = schema_elements[i];
                    node_attribute_name = schema_element.getAttribute("name");
                    if(node_attribute_name){
                        schema_element_help = $("documentation", schema_element)[0];
                        block_or_inline = (this.inline_elements.indexOf(node_attribute_name) >= 0) ? "inline" : "block";
                        this.elements[node_attribute_name] = {
                            display: block_or_inline,
                            help: schema_element_help ? schema_element_help.textContent : ""
                        };
                        this.schema_elements[node_attribute_name] = schema_element;
                    }
                }

                this.attributes = {};
                schema_elements = $("attribute", this.schema.documentElement);
                for(i = 0; i < schema_elements.length; i++){
                    schema_element = schema_elements[i];
                    node_attribute_name = schema_element.getAttribute("name");
                    if(node_attribute_name){
                        schema_element_help = $("documentation", schema_element)[0];
                        this.attributes[node_attribute_name] = {help: schema_element_help ? schema_element_help.textContent : ""};
                    }
                }

                this.schema_defines = {}; //cache some lookups
                schema_elements = $("define", this.schema.documentElement);
                for(i = 0; i < schema_elements.length; i++){
                    schema_element = schema_elements[i];
                    node_attribute_name = schema_element.getAttribute("name");
                    if(node_attribute_name){
                        this.schema_defines[node_attribute_name] = schema_element;
                    }
                }

                this.cached_context = {};

                return this_function(this.update_element_chooser, this)();
            },
            get_valid_nodes_for_context: function(element_name){
                var _this = this,
                    context,
                    max_depth = 10,
                    selector,
                    gather_below = function(nodes, depth){
                        var node,
                            node_name,
                            node_attribute_name,
                            i,
                            child_elements,
                            child_element_name;

                        if(depth === undefined) depth = 0;
                        for(i = 0; i < nodes.length; i++){
                            node = nodes[i];
                            node_name = node.nodeName;
                            node_attribute_name = (node.nodeType === node.ELEMENT_NODE) ? node.getAttribute("name") : undefined;
                            if(node_name === "element" && depth === 0) node_name = "we're not interested in this element so this is some random thing to skip to 'default' in switch/case";
                            switch(node_name) {
                                case "element":
                                    if(node_attribute_name) context.elements[node_attribute_name] = _this.elements[node_attribute_name];
                                    break;
                                case "attribute":
                                    if(node_attribute_name) context.attributes[node_attribute_name] = _this.attributes[node_attribute_name];
                                    break;
                                case "ref":
                                    node = _this.schema_defines[node_attribute_name]; //INTENTIONAL. NOT AN ERROR. SHUT UP JSHINT
                                default: // we have to go deeper
                                    if(depth <= max_depth && node.childNodes.length > 0) gather_below(node.childNodes, depth + 1);
                            }
                            
                        }
                    };
                if(element_name === doctored.CONSTANTS.root_context) { //then it's the root node so we use different logic because there is no parent node
                    return {elements: {}, attributes: {}}; //FIXME allow different root nodes
                }
                if(!this.cached_context[element_name]) {
                    context = {elements: {}, attributes: {}};
                    //console.log(element_name, this.schema_elements[element_name]);
                    gather_below([this.schema_elements[element_name]]);
                    this.cached_context[element_name] = context;
                }
                return this.cached_context[element_name];
            }
        },
        w3c_schema = {
            cache_useful_stuff_from_schema: function(){
                alert("W3C Schema isn't currently supported.");
            }
        },
        $ = doctored.$,
        format_init = function(instance, schema_url){
            var this_function  = doctored.util.this_function,
                file_extension = doctored.util.file_extension(schema_url),
                xhr;

            this.schema_url = doctored.base + "schemas" + schema_url;

            console.log(this.schema_url);
            if(this.ready === true) return this_function(this.update_element_chooser, this)();
            this.instance = instance;
            switch(file_extension.toLowerCase()){
                case "rng":
                    this.cache_useful_stuff_from_schema = relaxng.cache_useful_stuff_from_schema;
                    this.get_valid_nodes_for_context = relaxng.get_valid_nodes_for_context;
                    break;
                case "xsd":
                    this.cache_useful_stuff_from_schema = w3c_schema.cache_useful_stuff_from_schema;
                    this.get_valid_nodes_for_context = w3c_schema.get_valid_nodes_for_context;
                    break;
                default:
                    return alert("Unable to use a schema '" + file_extension + "'. RelaxNG files must have extension .rng and W3C Schema files must have extension .xsd");
            }
            xhr = new XMLHttpRequest();
            xhr.open("GET", this.schema_url, true);
            xhr.send(null);
            xhr.onreadystatechange = this_function(function(){
                if(xhr.readyState !== 4) return;
                if(xhr.responseXML){
                    this.schema = xhr.responseXML;
                } else {
                    this.schema = ( new window.DOMParser() ).parseFromString(xhr.responseText, "text/xml");
                }
                this_function(this.cache_useful_stuff_from_schema, this)();
                this_function(this.new_document, this)();
                this_function(this.instance.lint_soon, this.instance)();
            }, this);
        },
        update_element_chooser = function(){
            var element_chooser = this.instance.dialog.element_chooser,
                html = '<option value="" disabled selected>Choose Element</option>' +
                       '<optgroup label="Suggested elements in this context">' + // if you update this be sure to also update the one below in set_element_chooser_context()
                       '<option value="" disabled class="doctored-loading">Loading...</option>' +
                       '</optgroup>' +
                       '<optgroup label="All (' + Object.keys(this.elements).length + ' elements)">' +
                       doctored.util.to_options_tags(this.elements, true) +
                       '</optgroup>' +
                       '<optgroup label="Custom Element">' +
                       '<option value="(custom)">Choose a custom element</option>' +
                       '</optgroup>';

            element_chooser.innerHTML = html;
            element_chooser.context_chooser = $("optgroup", element_chooser)[0];
        },
        new_document = function(){
            this.instance.root.innerHTML = doctored.util.convert_xml_to_doctored_html(this.new_document_xml, this.elements);
        },
        set_dialog_context = function(dialog, element_name, existing_attributes){
            var this_function   = doctored.util.this_function,
                context_chooser = dialog.element_chooser.context_chooser,
                element_chooser = dialog.element_chooser,
                number_of_elements,
                context,
                keys,
                key,
                i;

            context = this_function(this.get_valid_nodes_for_context, this)(element_name);
            number_of_elements = Object.keys(context.elements).length;
            if(number_of_elements === 0) {
                context_chooser.setAttribute("label", "Suggested (0 elements)"); //TODO fix this, detect valid root nodes
                element_chooser.context_chooser.innerHTML = '<option value="" disabled>(None)</option>';
            } else {
                context_chooser.setAttribute("label", "Suggested under '" + element_name + "' (" + number_of_elements + " elements)");
                element_chooser.context_chooser.innerHTML = doctored.util.to_options_tags(context.elements, true);
            }
            keys = Object.keys(context.attributes).sort();
            for(i = 0; i < keys.length; i++){
                key = keys[i];
                if(!existing_attributes || !existing_attributes[key]){
                    doctored.util.dialog_append_attribute(dialog, key, "", context.attributes[key].help);
                }
            }
        };
       
    doctored.schema_family = { //format is a looser concept than schema. A format may have many schemas
        docbook: {
            name:              "DocBook 5",
            root_element:      "book",
            root_attributes:   {
                                    version: "5.0",
                                    xmlns: "http://docbook.org/ns/docbook",
                                    "xmlns:xlink": "http://wwww.w3.org/1999/xlink/"
                                },
            convert_from_html: function(html_string){
            // Typically called when people paste HTML and this is supposed to convert that to DocBook
            // this is just a prototype at the moment, not very useful
            // FIXME: improve this A LOT!
                var element_mapping   = {"p":    "para", "a": "ulink"},
                    attribute_mapping = {"href": "url"};
                return doctored.util.simple_transform(html_string, element_mapping, attribute_mapping);
            },
            new_document_xml: function(){
                return '<title>Book Title</title>' +
                       '<chapter><para>First paragraph <link xlink:href="http://docvert.org/">with hyperlink</link>.</para></chapter>';
            }(),
            parsed: false,
            init: format_init,
            update_element_chooser: update_element_chooser,
            set_dialog_context: set_dialog_context,
            new_document: new_document,
            inline_elements: ["abbrev","accel","acronym","address","alt","anchor","annotation","application","author","bibliolist","biblioref","blockquote","bridgehead","calloutlist","caution","citation","citebiblioid","citerefentry","citetitle","classname","classsynopsis","cmdsynopsis","code","command","computeroutput","constant","constraintdef","constructorsynopsis","coref","database","date","destructorsynopsis","editor","email","emphasis","envar","epigraph","equation","errorcode","errorname","errortext","errortype","example","exceptionname","fieldsynopsis","figure","filename","footnote","footnoteref","foreignphrase","funcsynopsis","function","glosslist","guibutton","guiicon","guilabel","guimenu","guimenuitem","guisubmenu","hardware","important","indexterm","info","informalequation","informalexample","informalfigure","initializer","inlineequation","inlinemediaobject","interfacename","itemizedlist","jobtitle","keycap","keycode","keycombo","keysym","link","literal","literallayout","markup","mediaobject","menuchoice","methodname","methodsynopsis","modifier","mousebutton","msgset","nonterminal","note","olink","option","optional","orderedlist","org","orgname","package","parameter","person","personname","phrase","procedure","productionset","productname","productnumber","programlisting","programlistingco","prompt","property","qandaset","quote","remark","replaceable","returnvalue","revhistory","screen","screenco","screenshot","segmentedlist","shortcut","sidebar","simplelist","subscript","superscript","symbol","synopsis","systemitem","tag","task","termdef","tip","token","trademark","type","uri","userinput","variablelist","varname","warning","wordasword","xref"]
        },
        'tei': {
            name:              "TEI 2.6.0",
            root_element:      "TEI",
            root_attributes:   {
                xmlns: "http://www.tei-c.org/ns/1.0"
            },
            ready: false,
            init: format_init,
            update_element_chooser: update_element_chooser,
            set_dialog_context: set_dialog_context,
            new_document: new_document,
            new_document_xml: function(){
                return '<title>Book Title</title>' +
                       '<chapter><para>First paragraph <ulink url="http://docvert.org/">with hyperlink</ulink>.</para></chapter>';
            }()
        },
        'dita': {
            name:              "DITA 1.8",
            root_element:      "topic",
            root_attributes:   {
                xmlns: "http://www.tei-c.org/ns/1.0"
            },
            ready: false,
            init: format_init,
            update_element_chooser: update_element_chooser,
            set_dialog_context: set_dialog_context,
            new_document: new_document,
            new_document_xml: function(){
                return '<title>Book Title</title>' +
                       '<chapter><para>First paragraph <ulink url="http://docvert.org/">with hyperlink</ulink>.</para></chapter>';
            }()
        },
    };


    doctored.schemas = {
        init: function(){
            var xhr = new XMLHttpRequest();
            
            xhr.open("GET", doctored.base + "schemas/manifest.json", true);
            xhr.send(null);
            xhr.onreadystatechange = function(){
                if(xhr.readyState !== 4) return;
                doctored.schemas.list = JSON.parse(xhr.responseText);
                doctored.event.trigger("schemas-loaded");
            };
        },
        get_schema_instance: function(instance, schema_family, schema_url){
            var schema_instance = doctored.schema_family[schema_family],
                this_function = doctored.util.this_function;

            if(!schema_instance) return alert("There is no support for the schema family of '" + schema_family + "' @ URL " + schema_url);

            this_function(schema_instance.init, schema_instance)(instance, schema_url);
            return schema_instance;
        }
    };

}());
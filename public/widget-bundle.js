"use strict";(()=>{var c=class{constructor(t,e){let o=this.getScriptOptions();this.container=t,this.options={theme:"light",maxHeight:"400px",position:"bottom-right",isPopup:!1,maxEntries:3,hidden:!1,...o,...e},this.isOpen=!1,this.isLoading=!1,this.init()}getScriptOptions(){let t=document.currentScript;return t?{theme:t.getAttribute("data-theme"),position:t.getAttribute("data-position"),maxHeight:t.getAttribute("data-max-height"),isPopup:t.getAttribute("data-popup")==="true",trigger:t.getAttribute("data-trigger"),maxEntries:t.getAttribute("data-max-entries")?parseInt(t.getAttribute("data-max-entries"),10):void 0,hidden:t.getAttribute("data-popup")==="true"}:{}}updatePosition(){if(this.options.isPopup)switch(this.container.style.removeProperty("top"),this.container.style.removeProperty("bottom"),this.container.style.removeProperty("left"),this.container.style.removeProperty("right"),this.options.position){case"top-right":this.container.style.setProperty("top","20px","important"),this.container.style.setProperty("right","20px","important");break;case"top-left":this.container.style.setProperty("top","20px","important"),this.container.style.setProperty("left","20px","important");break;case"bottom-left":this.container.style.setProperty("bottom","20px","important"),this.container.style.setProperty("left","20px","important");break;case"bottom-right":default:this.container.style.setProperty("bottom","20px","important"),this.container.style.setProperty("right","20px","important");break}}addStyles(){let t=`
            .changerawr-widget {
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 14px;
                line-height: 1.5;
                color: #1a1a1a;
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                width: 300px;
                overflow: hidden;
                opacity: 1;
                transform: translateY(0);
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            
            .changerawr-widget.popup {
                position: fixed !important;
                z-index: 9999 !important;
                opacity: 0;
                transform: translateY(20px);
                pointer-events: none;
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            
            /* Position-specific transforms */
            .changerawr-widget.popup[data-position="top-right"],
            .changerawr-widget.popup[data-position="top-left"] {
                transform: translateY(-20px);
            }

            .changerawr-widget.popup[data-position="bottom-right"],
            .changerawr-widget.popup[data-position="bottom-left"] {
                transform: translateY(20px);
            }

            .changerawr-widget.popup.open {
                opacity: 1 !important;
                transform: translateY(0) !important;
                pointer-events: all !important;
            }

            .changerawr-widget.hidden {
                display: none !important;
            }

            .changerawr-widget.dark {
                color: #ffffff;
                background: #1a1a1a;
            }

            .changerawr-header {
                padding: 12px 16px;
                border-bottom: 1px solid #eaeaea;
                font-weight: 600;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .changerawr-close {
                background: none;
                border: none;
                padding: 4px;
                cursor: pointer;
                color: inherit;
                opacity: 0.6;
                transition: opacity 0.2s;
            }

            .changerawr-close:hover {
                opacity: 1;
            }

            .changerawr-close:focus {
                outline: 2px solid #0066ff;
                border-radius: 4px;
            }

            .dark .changerawr-header {
                border-color: #333;
            }

            .changerawr-entries {
                max-height: var(--max-height, 400px);
                overflow-y: auto;
                padding: 8px 0;
            }

            .changerawr-entry {
                padding: 8px 16px;
                border-bottom: 1px solid #f5f5f5;
                opacity: 0;
                transform: translateY(10px);
                animation: slideIn 0.3s ease forwards;
            }

            .changerawr-entry:nth-child(2) {
                animation-delay: 0.1s;
            }

            .changerawr-entry:nth-child(3) {
                animation-delay: 0.2s;
            }

            @keyframes slideIn {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .dark .changerawr-entry {
                border-color: #333;
            }

            .changerawr-entry:last-child {
                border: none;
            }

            .changerawr-entry:focus-within {
                background: #f5f5f5;
            }

            .dark .changerawr-entry:focus-within {
                background: #333;
            }

            .changerawr-tag {
                display: inline-block;
                padding: 2px 8px;
                background: #e8f2ff;
                color: #0066ff;
                border-radius: 4px;
                font-size: 12px;
                margin-bottom: 4px;
            }

            .dark .changerawr-tag {
                background: #1a365d;
                color: #60a5fa;
            }

            .changerawr-entry-title {
                font-weight: 500;
                margin-bottom: 4px;
            }

            .changerawr-entry-content {
                color: #666;
                font-size: 13px;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 8px;
            }

            .dark .changerawr-entry-content {
                color: #999;
            }

            .changerawr-read-more {
                color: #0066ff;
                text-decoration: none;
                font-size: 12px;
                display: inline-block;
                margin-top: 4px;
                padding: 2px;
            }

            .changerawr-read-more:focus {
                outline: 2px solid #0066ff;
                border-radius: 4px;
            }

            .dark .changerawr-read-more {
                color: #60a5fa;
            }

            .changerawr-read-more:hover {
                text-decoration: underline;
            }

            .changerawr-loading {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100px;
            }

            .changerawr-spinner {
                width: 24px;
                height: 24px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #0066ff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .dark .changerawr-spinner {
                border-color: #333;
                border-top-color: #60a5fa;
            }

            .changerawr-footer {
                padding: 8px 16px;
                border-top: 1px solid #eaeaea;
                font-size: 12px;
                color: #666;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .dark .changerawr-footer {
                border-color: #333;
                color: #999;
            }

            .changerawr-footer a {
                color: inherit;
                text-decoration: none;
            }

            .changerawr-footer a:hover {
                text-decoration: underline;
            }
        `,e=document.createElement("style");e.textContent=t,document.head.appendChild(e)}async init(){this.addStyles();let t=`changerawr-widget ${this.options.theme}`;this.options.isPopup&&(t+=" popup"),this.options.hidden&&(t+=" hidden"),this.container.className=t,this.container.style.setProperty("--max-height",this.options.maxHeight),this.container.setAttribute("role","dialog"),this.container.setAttribute("aria-label","Changelog updates"),this.options.isPopup&&this.updatePosition(),this.render(),await this.loadEntries(),this.setupKeyboardNavigation(),this.options.trigger&&this.setupTriggerButton()}setupKeyboardNavigation(){this.container.addEventListener("keydown",t=>{if(t.key==="Escape"&&this.isOpen&&this.close(),t.key==="Tab"){let e=this.container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),o=e[0],i=e[e.length-1];t.shiftKey&&document.activeElement===o?(t.preventDefault(),i.focus()):!t.shiftKey&&document.activeElement===i&&(t.preventDefault(),o.focus())}})}setupTriggerButton(){let t=document.getElementById(this.options.trigger);if(!t){console.warn(`Changerawr: Trigger button with ID '${this.options.trigger}' not found`);return}t.setAttribute("aria-expanded","false"),t.setAttribute("aria-haspopup","dialog"),t.setAttribute("aria-controls",this.container.id),t.addEventListener("click",()=>{this.toggle(),t.setAttribute("aria-expanded",this.isOpen.toString())}),t.addEventListener("keydown",e=>{(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),this.toggle(),t.setAttribute("aria-expanded",this.isOpen.toString()))})}render(){let t=document.createElement("div");t.className="changerawr-header",t.innerHTML=`
            <span>Latest Updates</span>
            ${this.options.isPopup?`
                <button 
                    class="changerawr-close" 
                    aria-label="Close changelog"
                >
                    <svg width="16" height="16" viewBox="0 0 16 16">
                        <path 
                            fill="currentColor" 
                            d="M8 6.586L4.707 3.293 3.293 4.707 6.586 8l-3.293 3.293 1.414 1.414L8 9.414l3.293 3.293 1.414-1.414L9.414 8l3.293-3.293-1.414-1.414L8 6.586z"
                        />
                    </svg>
                </button>
            `:""}
        `,this.container.appendChild(t);let e=document.createElement("div");e.className="changerawr-entries",e.setAttribute("role","list"),this.container.appendChild(e);let o=document.createElement("div");o.className="changerawr-footer",o.innerHTML=`
            <span>Powered by Changerawr</span>
            <a href="http://localhost:3000/changelog/${this.options.projectId}/rss.xml" target="_blank" rel="noopener noreferrer">RSS</a>
        `,this.container.appendChild(o),this.renderLoading();let i=this.container.querySelector(".changerawr-close");i&&i.addEventListener("click",()=>this.close())}renderLoading(){let t=this.container.querySelector(".changerawr-entries");t.innerHTML=`
            <div class="changerawr-loading">
                <div class="changerawr-spinner" role="status"></div>
            </div>
        `}async loadEntries(){this.isLoading=!0;try{let t=await fetch(`http://localhost:3000/api/changelog/${this.options.projectId}/entries`);if(!t.ok)throw new Error("Failed to fetch entries");let e=await t.json();this.renderEntries(e.items)}catch(t){console.error("Failed to load changelog:",t),this.renderError()}finally{this.isLoading=!1}}renderEntries(t){let e=this.container.querySelector(".changerawr-entries");e.innerHTML="",t.slice(0,this.options.maxEntries).forEach(i=>{var h;let n=document.createElement("div");if(n.className="changerawr-entry",n.setAttribute("role","listitem"),n.setAttribute("tabindex","0"),(h=i.tags)!=null&&h.length){let p=document.createElement("div");p.className="changerawr-tag",p.textContent=i.tags[0].name,n.appendChild(p)}let a=document.createElement("div");a.className="changerawr-entry-title",a.textContent=i.title,n.appendChild(a);let d=document.createElement("div");d.className="changerawr-entry-content",d.textContent=i.content,n.appendChild(d);let s=document.createElement("a");s.href=`http://localhost:3000/changelog/${this.options.projectId}#${i.id}`,s.className="changerawr-read-more",s.textContent="Read more",s.target="_blank",s.setAttribute("aria-label",`Read more about ${i.title}`),n.appendChild(s),e.appendChild(n)})}renderError(){let t=this.container.querySelector(".changerawr-entries");t.innerHTML=`
            <div class="changerawr-error">
                Failed to load changelog entries
                <br>
                <button class="changerawr-retry">
                    Try Again
                </button>
            </div>
        `,t.querySelector(".changerawr-retry").addEventListener("click",()=>this.loadEntries())}open(){if(!this.options.isPopup)return;this.isOpen=!0,this.container.classList.remove("hidden"),this.container.style.display="block",requestAnimationFrame(()=>{this.container.classList.add("open")}),this.previouslyFocused=document.activeElement;let t=this.container.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');t&&t.focus()}close(){if(!this.options.isPopup)return;this.isOpen=!1,this.container.classList.remove("open");let t=()=>{this.isOpen||(this.options.hidden&&this.container.classList.add("hidden"),this.container.style.display="none"),this.container.removeEventListener("transitionend",t)};this.container.addEventListener("transitionend",t),this.previouslyFocused&&this.previouslyFocused.focus()}toggle(){this.isOpen?this.close():this.open()}};document.addEventListener("DOMContentLoaded",()=>{document.querySelectorAll('script[src*="/api/integrations/widget/"]').forEach(t=>{let e=t.getAttribute("src").match(/\/api\/widget\/([^?]+)/);if(!e)return;let o=e[1],i=t.getAttribute("data-position")||"bottom-right";["top-right","top-left","bottom-right","bottom-left"].includes(i)||console.warn(`Invalid position '${i}', defaulting to bottom-right`);let n=document.createElement("div");n.id=`changerawr-widget-${Math.random().toString(36).substr(2,9)}`;let a=t.getAttribute("data-popup")==="true";a?document.body.appendChild(n):t.parentNode.insertBefore(n,t);let d=new c(n,{projectId:o,theme:t.getAttribute("data-theme")||"light",position:t.getAttribute("data-position")||"bottom-right",isPopup:a,trigger:t.getAttribute("data-trigger"),maxEntries:t.getAttribute("data-max-entries")?parseInt(t.getAttribute("data-max-entries"),10):3,hidden:a})})});window.ChangerawrWidget={init:r=>{if(!r.container)throw new Error("Container element is required");if(!r.projectId)throw new Error("Project ID is required");let t=r.position||"bottom-right";return["top-right","top-left","bottom-right","bottom-left"].includes(t)||console.warn(`Invalid position '${t}', defaulting to bottom-right`),r.container.id=r.container.id||`changerawr-widget-${Math.random().toString(36).substr(2,9)}`,r.isPopup&&document.body.appendChild(r.container),new c(r.container,{projectId:r.projectId,theme:r.theme||"light",maxHeight:r.maxHeight||"400px",position:r.position||"bottom-right",isPopup:r.isPopup||!1,maxEntries:r.maxEntries||3,hidden:r.isPopup||!1,trigger:r.trigger})}};})();
//# sourceMappingURL=widget-bundle.js.map

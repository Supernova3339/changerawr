- [ ] custom fields
- [x] tags can have a color assigned to them (requires updating the SDKs) - partially done DB side, UI implementation
  must be done.
    - update tag UI to allow for assigning colors
    - update PHP & React SDK to return this value
    - update changelog entries display, changelog tag picker, changelog API to return tag color

- [x] pwnedpasswords password check
- [x] custom domains (what a headache to implement!)
- [x] scheduled publishing
- [x] full-text search
- [x] version range comparison (catch-up) thinking a digest of what's been done from here-to-there, could be fun!
- [ ] more changelog customization
    - set SEO for public changelog
    - custom scripting for public changelog ( custom js, CSS makes no sense due to changerawr being a CMS)
    - set a logo for your changelog
        - requirements:
        - media manager
        - storage providers (s3, local, maybe google drive not sure)
        - enables for reusable media that can be uploaded to the content editor.

- [ ] ability to specify a custom logo for an SSO provider (will be added when I get around to media storage!)
- [ ] update the MCP server so it can use scheduled publishing
- [ ] collaboration ( real time, this is complicated! )
- [ ] allow for inviting other staff members to work on the same changelog entry - collaboration
- [x] CLI for Changerawr
- [ ] do stuff with the syncCommit and syncCommitMetadata (no ideas what I could do as of writing)
- [x] extend markdown with custom elements (perhaps, can call it Changerawr Universal Markdown engine) - CUM
- [x] allow for importing a full changelog.md into changerawr to jump-start a project from existing data. look into
  canny importing as well.
- [x] add a configuration option for project email notifications to allow emails to be sent out on publish
- [x] allow users to bookmark the entry they are working on to their favorites
- [x] upgrade to next 16
- [x] allow for manually giving a publish date.
- [x] add scopes to API keys for permissioning, also added project-level API keys.
- [ ] allow for collecting user feedback ( NPS )
- [ ] publish in multiple languages

# widget ideas
- [x] classic widget
- [x] floating widget ( needs fixes, perhaps full rewrite! ) - last thing to do before launching v1.0.5!
- [x] announcement bar widget
- [x] modal widget

### CLI Ideas

- [x] get all changelogs under .changerawr/changelogs/${date} via ( changerawr pull --skip-single-file )
- [ ] figure out if providing a **changerawr push** command is a good idea | add to **changerawr doctor** if implemented.

### Changerawr Universal Markdown Engine Ideas

- [x] Support Subtext
- [x] Support Tables
- [x] Support the cool thing Reddit does where you can bold text in a heading ( how did they figure this out? )
- [x] migrate from internal engine to the package. not sure if this a good idea, maybe? - would require a full rewrite of the editor, but also ensures feature-parity.

### Sponsorship ideas
Honestly, I need some sort of funding for this at some point. Here's a list of stuff that might incentivise you to support my efforts.
- [ ] the about page has a list of every single sponsorer of the Changerawr project
- [ ] dedicated page on the Changerawr website for viewing all sponsors.
- [ ] sponsor tiers are overrated, will separate it by business/personal though. Any level of support is appreciated.
- [ ] add a license key system to Changerawr that literally just gives a "supporter" badge in the about page. 
- [ ] higher feature request priority. I am extremely talented and can most likely add any feature that is requested, perhaps this is a good incentive?

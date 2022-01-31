const fs = require('fs')

String.prototype.replaceAt = function (start, length, replacement) {
  return this.substr(0, start) + replacement + this.substr(parseInt(start+length));
}


fs.readFile('input', 'utf8', (err, deliveryApiRichTextValue) => {

  if (err) {
    console.error(err);
    return;
  }

   

  /*** CLEAN ASSETS INCLUDED IN THE RICH TEXT ***/
  // Management API supported attributes: data-asset-id
  // (from https://docs.kontent.ai/reference/management-api-v2#section/Rich-text-element/assets-in-rich-text)

  // Delivery API additional attributes: data-image-id, alt -> these have to be removed
  // (from https://docs.kontent.ai/reference/delivery-api#section/Rich-text-element/images-single-object)
  
  // This will find all of figures that contain data-asset-id property anywhere in the tag (or children tags)
  const foundFigures = [...deliveryApiRichTextValue.matchAll(/(?:<figure)[^>]*?(?:data-asset-id=)[\s|\S]*?(?:<\/figure>)/gi)];

  // The output will be an array of items like this 
  // (from the delivery API docs https://docs.kontent.ai/reference/delivery-api#section/Rich-text-element/images-single-object)
  /* 
    <figure 
      data-image-id="92526b35-1cb0-481c-b6d9-453e3d7a2313" 
      data-asset-id="92526b35-1cb0-481c-b6d9-453e3d7a2313">
      
      <img 
        src="https://assets-us-01.kc-usercontent.com:443/20210423_091803.jpg" 
        data-image-id="92526b35-1cb0-481c-b6d9-453e3d7a2313" 
        alt="" 
        data-asset-id="92526b35-1cb0-481c-b6d9-453e3d7a2313">
    
    </figure>
  */

  // now we need to remove all of the delivery API properties that cannot be consumed by the management API for each found figure
  // we are going backwards because strings are immutable in js and the matches positions would be invalid if we started changing the string from the start
  for (let i = foundFigures.length - 1, figure; (figure = foundFigures[i]); i--) {

    // remove the data-image-id & alt attributes
    const cleanFigure = figure[0].replaceAll(/(?:data-image-id=)[^>\s]+|(?:alt=)[^>\s]+/gi, "");
    deliveryApiRichTextValue = deliveryApiRichTextValue.replaceAt(figure.index, figure[0].length, cleanFigure);
  }

  /*** CLEAN LINKS INCLUDED IN RICH TEXT ***/

  // Links to external URLs: href, title, data-new-window
  // Links to email addresses: data-email-address, data-email-subject
  // Links to assets: data-asset-id
  // Links to content items: data-item-id

  // (from https://docs.kontent.ai/reference/management-api-v2#section/Rich-text-element/links-in-rich-text)

  // Unsupported attributes from Delivery API: target, rel, href (everywhere but external URLs)
  // (from https://docs.kontent.ai/reference/delivery-api#section/Rich-text-element/links-single-object)

  let managementApiInput = deliveryApiRichTextValue;

  // Lets find all links
  const foundLinks = [...managementApiInput.matchAll(/(?:<a)[\s|\S]*?(?:<\/a>)/gi)];
  
  // Delivery API output example:
  /* <a
      data-asset-id="8f12a6ab-bada-4e1d-ba27-ca58b7ddab61" 
      href="https://assets-us-01.kc-usercontent.com:443/test.jpg">LINK</a>',
  
    <a 
      data-item-id="5ddf5ceb-975b-4fae-ba9f-bd1abb929460" 
      href="">LINK TO URL</a>',

    <a 
      href="https://bitly.com/kontent-discord" 
      data-new-window="true" 
      title="lol" 
      target="_blank" 
      rel="noopener noreferrer">LINK TO PUBLIC</a>',

    `<a 
      data-email-address="test@test.com" 
      data-email-subject="test email" 
      href="mailto:test@test.com?subject=test email">LINK TO EMAIL</a> */

  for (let i = foundLinks.length - 1, link; (link = foundLinks[i]); i--) {
    
    const linkString = link[0];

    // link to asset, or link to email, or link to item -> remove href
    if ((linkString.match(/(?:data-asset-id)/)) || (linkString.match(/(?:data-email-address)/)) || (linkString.match(/(?:data-item-id)/))) {
      const cleanLink = link[0].replaceAll(/(?:href=)[^>\s]+/gi, "");
      managementApiInput = managementApiInput.replaceAt(link.index, link[0].length, cleanLink);
    }
    // link to URL -> remove target, rel
    else {
      const cleanExternalLink = link[0].replaceAll(/(?:target=)[^>\s]+|(?:rel=)[^>]+/gi, "");
      managementApiInput = managementApiInput.replaceAt(link.index, link[0].length, cleanExternalLink);
    }
  }
  
  fs.writeFile('output', managementApiInput, err => {
    if (err) {
      console.error(err)
      return
    }
  });
});


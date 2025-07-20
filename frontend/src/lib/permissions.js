/**
 * Check if user can read a document
 * @param {string} doctype
 **/
export const canReadDocument = (doctype) => {
    return window.frappe?.boot?.user?.can_read?.includes(doctype)
}


/**
 * Check if user can write a document
 * @param {string} doctype
 **/
export const canWriteDocument = (doctype) => {
    return window.frappe?.boot?.user?.can_write?.includes(doctype)
}


/**
 * Check if user can create a document
 * @param {string} doctype
 **/
export const canCreateDocument = (doctype) => {
    return window.frappe?.boot?.user?.can_create?.includes(doctype)
}


/**
 * Check if user can delete a document
 * @param {string} doctype
 **/
export const canDeleteDocument = (doctype) => {
    return window.frappe?.boot?.user?.can_delete?.includes(doctype)
}


/**
 * Check if user can cancel a document
 * @param {string} doctype
 **/
export const canCancelDocument = (doctype) => {
    return window.frappe?.boot?.user?.can_cancel?.includes(doctype)
}


/**
 * Check if user can search a document
 * @param {string} doctype
 **/
export const canSearchDocument = (doctype) => {
    return window.frappe?.boot?.user?.can_search?.includes(doctype)
}


/**
 * Check if user can import a document
 * @param {string} doctype
 **/
export const canImportDocument = (doctype) => {
    return window.frappe?.boot?.user?.can_import?.includes(doctype)
}


/**
 * Check if user can export a document
 * @param {string} doctype
 **/
export const canExportDocument = (doctype) => {
    return window.frappe?.boot?.user?.can_export?.includes(doctype)
}
/**
 * Check if the user has a role
 * @param {string} role 
 * @returns boolean
 */
export const hasRole = (role) => {
    return window.frappe?.boot?.user?.roles?.includes(role)
}
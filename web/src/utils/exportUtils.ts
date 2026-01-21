import * as XLSX from "xlsx";

/**
 * Downloads data as a JSON file
 * @param data The data object to download
 * @param filename The filename (without extension)
 */
export const downloadJson = (data: any, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Downloads data as an Excel file
 * @param data Array of objects to export
 * @param filename The filename (without extension)
 * @param sheetName The name of the sheet (default: "Data")
 */
export const downloadExcel = (
  data: any[],
  filename: string,
  sheetName: string = "Data",
) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

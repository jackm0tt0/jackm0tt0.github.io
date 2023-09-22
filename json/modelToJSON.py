import json
dict = {'cat':1, 'bat':2, 'hat':3, 'rat':4}
with open("C:\Users\jackm\Documents\Web_REPO\json\json_test.json", 'w') as file:
    file.writelines(json.dumps(dict))
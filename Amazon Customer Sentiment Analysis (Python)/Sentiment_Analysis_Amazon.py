{
 "cells": [
  {
   "cell_type": "code",
   "execution_count": 1,
   "id": "919ec5c6",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:30.935505Z",
     "iopub.status.busy": "2024-07-30T14:28:30.935103Z",
     "iopub.status.idle": "2024-07-30T14:28:34.345576Z",
     "shell.execute_reply": "2024-07-30T14:28:34.344277Z"
    },
    "papermill": {
     "duration": 3.422389,
     "end_time": "2024-07-30T14:28:34.348177",
     "exception": false,
     "start_time": "2024-07-30T14:28:30.925788",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [],
   "source": [
    "import pandas as pd\n",
    "import numpy as np\n",
    "import matplotlib.pyplot as plt\n",
    "import seaborn as sns\n",
    "\n",
    "plt.style.use('ggplot')\n",
    "\n",
    "import nltk"
   ]
  },
  {
   "cell_type": "markdown",
   "id": "59619514",
   "metadata": {
    "papermill": {
     "duration": 0.00721,
     "end_time": "2024-07-30T14:28:34.363090",
     "exception": false,
     "start_time": "2024-07-30T14:28:34.355880",
     "status": "completed"
    },
    "tags": []
   },
   "source": [
    "****"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 2,
   "id": "01d9291c",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:34.379638Z",
     "iopub.status.busy": "2024-07-30T14:28:34.379056Z",
     "iopub.status.idle": "2024-07-30T14:28:42.758085Z",
     "shell.execute_reply": "2024-07-30T14:28:42.756761Z"
    },
    "papermill": {
     "duration": 8.390571,
     "end_time": "2024-07-30T14:28:42.760969",
     "exception": false,
     "start_time": "2024-07-30T14:28:34.370398",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "name": "stdout",
     "output_type": "stream",
     "text": [
      "(568454, 10)\n",
      "(500, 10)\n"
     ]
    }
   ],
   "source": [
    "df = pd.read_csv('../input/amazon-fine-food-reviews/Reviews.csv')\n",
    "print(df.shape)\n",
    "df = df.head(500)\n",
    "print(df.shape)"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 3,
   "id": "99f29e5c",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:42.780183Z",
     "iopub.status.busy": "2024-07-30T14:28:42.779377Z",
     "iopub.status.idle": "2024-07-30T14:28:42.806529Z",
     "shell.execute_reply": "2024-07-30T14:28:42.805263Z"
    },
    "papermill": {
     "duration": 0.039448,
     "end_time": "2024-07-30T14:28:42.809051",
     "exception": false,
     "start_time": "2024-07-30T14:28:42.769603",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "data": {
      "text/html": [
       "<div>\n",
       "<style scoped>\n",
       "    .dataframe tbody tr th:only-of-type {\n",
       "        vertical-align: middle;\n",
       "    }\n",
       "\n",
       "    .dataframe tbody tr th {\n",
       "        vertical-align: top;\n",
       "    }\n",
       "\n",
       "    .dataframe thead th {\n",
       "        text-align: right;\n",
       "    }\n",
       "</style>\n",
       "<table border=\"1\" class=\"dataframe\">\n",
       "  <thead>\n",
       "    <tr style=\"text-align: right;\">\n",
       "      <th></th>\n",
       "      <th>Id</th>\n",
       "      <th>ProductId</th>\n",
       "      <th>UserId</th>\n",
       "      <th>ProfileName</th>\n",
       "      <th>HelpfulnessNumerator</th>\n",
       "      <th>HelpfulnessDenominator</th>\n",
       "      <th>Score</th>\n",
       "      <th>Time</th>\n",
       "      <th>Summary</th>\n",
       "      <th>Text</th>\n",
       "    </tr>\n",
       "  </thead>\n",
       "  <tbody>\n",
       "    <tr>\n",
       "      <th>0</th>\n",
       "      <td>1</td>\n",
       "      <td>B001E4KFG0</td>\n",
       "      <td>A3SGXH7AUHU8GW</td>\n",
       "      <td>delmartian</td>\n",
       "      <td>1</td>\n",
       "      <td>1</td>\n",
       "      <td>5</td>\n",
       "      <td>1303862400</td>\n",
       "      <td>Good Quality Dog Food</td>\n",
       "      <td>I have bought several of the Vitality canned d...</td>\n",
       "    </tr>\n",
       "    <tr>\n",
       "      <th>1</th>\n",
       "      <td>2</td>\n",
       "      <td>B00813GRG4</td>\n",
       "      <td>A1D87F6ZCVE5NK</td>\n",
       "      <td>dll pa</td>\n",
       "      <td>0</td>\n",
       "      <td>0</td>\n",
       "      <td>1</td>\n",
       "      <td>1346976000</td>\n",
       "      <td>Not as Advertised</td>\n",
       "      <td>Product arrived labeled as Jumbo Salted Peanut...</td>\n",
       "    </tr>\n",
       "    <tr>\n",
       "      <th>2</th>\n",
       "      <td>3</td>\n",
       "      <td>B000LQOCH0</td>\n",
       "      <td>ABXLMWJIXXAIN</td>\n",
       "      <td>Natalia Corres \"Natalia Corres\"</td>\n",
       "      <td>1</td>\n",
       "      <td>1</td>\n",
       "      <td>4</td>\n",
       "      <td>1219017600</td>\n",
       "      <td>\"Delight\" says it all</td>\n",
       "      <td>This is a confection that has been around a fe...</td>\n",
       "    </tr>\n",
       "    <tr>\n",
       "      <th>3</th>\n",
       "      <td>4</td>\n",
       "      <td>B000UA0QIQ</td>\n",
       "      <td>A395BORC6FGVXV</td>\n",
       "      <td>Karl</td>\n",
       "      <td>3</td>\n",
       "      <td>3</td>\n",
       "      <td>2</td>\n",
       "      <td>1307923200</td>\n",
       "      <td>Cough Medicine</td>\n",
       "      <td>If you are looking for the secret ingredient i...</td>\n",
       "    </tr>\n",
       "    <tr>\n",
       "      <th>4</th>\n",
       "      <td>5</td>\n",
       "      <td>B006K2ZZ7K</td>\n",
       "      <td>A1UQRSCLF8GW1T</td>\n",
       "      <td>Michael D. Bigham \"M. Wassir\"</td>\n",
       "      <td>0</td>\n",
       "      <td>0</td>\n",
       "      <td>5</td>\n",
       "      <td>1350777600</td>\n",
       "      <td>Great taffy</td>\n",
       "      <td>Great taffy at a great price.  There was a wid...</td>\n",
       "    </tr>\n",
       "  </tbody>\n",
       "</table>\n",
       "</div>"
      ],
      "text/plain": [
       "   Id   ProductId          UserId                      ProfileName  \\\n",
       "0   1  B001E4KFG0  A3SGXH7AUHU8GW                       delmartian   \n",
       "1   2  B00813GRG4  A1D87F6ZCVE5NK                           dll pa   \n",
       "2   3  B000LQOCH0   ABXLMWJIXXAIN  Natalia Corres \"Natalia Corres\"   \n",
       "3   4  B000UA0QIQ  A395BORC6FGVXV                             Karl   \n",
       "4   5  B006K2ZZ7K  A1UQRSCLF8GW1T    Michael D. Bigham \"M. Wassir\"   \n",
       "\n",
       "   HelpfulnessNumerator  HelpfulnessDenominator  Score        Time  \\\n",
       "0                     1                       1      5  1303862400   \n",
       "1                     0                       0      1  1346976000   \n",
       "2                     1                       1      4  1219017600   \n",
       "3                     3                       3      2  1307923200   \n",
       "4                     0                       0      5  1350777600   \n",
       "\n",
       "                 Summary                                               Text  \n",
       "0  Good Quality Dog Food  I have bought several of the Vitality canned d...  \n",
       "1      Not as Advertised  Product arrived labeled as Jumbo Salted Peanut...  \n",
       "2  \"Delight\" says it all  This is a confection that has been around a fe...  \n",
       "3         Cough Medicine  If you are looking for the secret ingredient i...  \n",
       "4            Great taffy  Great taffy at a great price.  There was a wid...  "
      ]
     },
     "execution_count": 3,
     "metadata": {},
     "output_type": "execute_result"
    }
   ],
   "source": [
    "df.head()"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 4,
   "id": "17e00495",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:42.828842Z",
     "iopub.status.busy": "2024-07-30T14:28:42.828405Z",
     "iopub.status.idle": "2024-07-30T14:28:43.171705Z",
     "shell.execute_reply": "2024-07-30T14:28:43.170152Z"
    },
    "papermill": {
     "duration": 0.35738,
     "end_time": "2024-07-30T14:28:43.174254",
     "exception": false,
     "start_time": "2024-07-30T14:28:42.816874",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "data": {
      "image/png": "iVBORw0KGgoAAAANSUhEUgAAAz8AAAHWCAYAAABZgTcgAAAAOXRFWHRTb2Z0d2FyZQBNYXRwbG90bGliIHZlcnNpb24zLjcuNSwgaHR0cHM6Ly9tYXRwbG90bGliLm9yZy/xnp5ZAAAACXBIWXMAAA9hAAAPYQGoP6dpAABGvUlEQVR4nO3de1xVdb7/8fcGNvdkg6iAiKBGWipYpokeUXRymjym6dHCyjKtxks1/Zxu3k3HtJxTjXWOR7G0i+nY0bRM7eIl08pLeTc0MW9gkoApohtYvz96sI5bQNkJe4+s1/Px6DGs+2ctP2O8W9+1ls0wDEMAAAAAUMv5eLsAAAAAAPAEwg8AAAAASyD8AAAAALAEwg8AAAAASyD8AAAAALAEwg8AAAAASyD8AAAAALAEwg8AAAAASyD8AAAAALAEwg8AWNDq1auVkpIih8Mhm82m3r17e7sktx06dEg2m00PPvigt0u5arXpXADgXxnhB8A1b9++fRo5cqRatmypsLAw+fv7KyYmRnfeeacyMjJ0/vx5b5d4RW+99ZZsNpveeuutGj/WoUOHdNdddykrK0uDBw/W+PHjdc8991x2m7Vr18pms7n8Y7fbFRMTo7vvvlvr16+v8bpRc0pKSjR79mylpqYqIiJCdrtd9evXV+vWrTVkyBAtW7bMZX1P9isAVCc/bxcAAFdj0qRJmjhxokpLS9WhQwcNGjRIoaGhOnHihNauXashQ4bov/7rv7RlyxZvl/ov47PPPlNRUZFmzJih9PR0t7Zt3LixeXeisLBQW7du1ZIlS7R06VItXLhQ//Ef/1EDFVesYcOG2rt3r8LCwjx2zNqopKREPXv21MqVK+VwOHTnnXcqNjZWFy5c0O7du/Xee+9p37596tWrl7dLBYCrRvgBcM3629/+pvHjx6tRo0b65z//qfbt25db56OPPtKMGTO8UN2/ruPHj0uSYmJi3N42Pj5eEyZMcJn34osv6rnnntPTTz/t0fBjt9vVvHlzjx2vtlqwYIFWrlyppKQkrVu3rlyYLCws1DfffOOl6gCgejHsDcA16dChQ5owYYLsdrtWrFhRYfCRZP4X7UstWrRInTt3VlhYmIKCgtSqVStNnTq1wiFyNptNXbp0qXD/Dz74oGw2mw4dOuRSW9nzG4cOHdI999yjyMhIBQYGqm3btvroo49c9tGlSxc99NBDkqSHHnrIZWjZxfu9nKqcT9nQtfHjx0uSunbtah5n7dq1VTpORR5++GHzvHNzc8stX7Bggbp27SqHw6HAwEC1aNFCkydPdqnt2LFj8vX1VZs2bSo9zh133CGbzaZdu3aZx6vsOZnCwkJNnTpVycnJCgkJUWhoqDp06KAFCxa4rPfDDz/IZrNp4MCBLvOzsrLMa/Pll1+6LHvmmWdks9n0xRdfmPN27Nihe++9V/Hx8QoICFC9evV0880368knn5TT6az0nCqyb98+9e7dWxEREQoJCVGnTp20evVql3VmzZolm82miRMnVriPnJwc2e12tWrV6orH27hxo6Tfermiu2jBwcHq2rWrOV2Vfj1+/LgmTZqkjh07KioqyhyKmp6erj179pQ7xsV/lpmZmRowYIDq168vHx8fszcPHjyoRx55RM2aNVNQUJAiIiLUqlUrPfbYY/rll1+ueJ4AIHHnB8A16s0335TT6dQ999yjli1bXnbdgIAAl+nnn39eU6dOVWRkpNLT0xUaGqpPPvlEzz//vFatWqXVq1fL39//qmv86aef1K5dOzVp0kT333+/Tp06pYULF+quu+7SZ599Zv5C+eCDD8rhcOjDDz/UXXfdpeTkZHMfDofjisep6vnEx8dr/PjxWrt2rdatW6dBgwYpPj5eksz/vVp2u91levDgwXrzzTcVGxurvn37yuFw6Ouvv9bYsWP1+eef69NPP5Wfn58aNmyo7t27a/Xq1dq5c2e5X9qzs7P16aef6pZbbrnin3d+fr7S0tL03Xff6eabb9bgwYNVWlqqVatWKT09Xbt379bkyZMlSTfccIMaNmzoEmQk6fPPP3f5+d/+7d9cpgMDA5WSkiLpt+DTvn172Ww29erVSwkJCTp9+rQOHDigN954Q5MnTy53XSqTlZWlDh06qFWrVnr00UeVnZ2thQsX6o477tB7772nAQMGSJIGDhyop59+WhkZGRozZox8fX1d9jN37lwVFxfr0UcfveIx69atK0nKzMysUo1V6df169frxRdfVNeuXdW3b1+FhoZq//79Wrx4sZYtW6avvvpKSUlJ5fb9448/qn379kpMTNTAgQN17tw51alTR9nZ2br11lt1+vRp/elPf1Lfvn1VVFSkrKwsvf322xoxYoR5HgBwWQYAXIPS0tIMScbs2bPd2m7jxo2GJKNRo0ZGdna2Od/pdBo9e/Y0JBlTpkxx2UaSkZqaWuH+Bg0aZEgysrKyzHlZWVmGJEOSMWHCBJf1V65caUgy7rjjDpf5b775piHJePPNN2v8fMaPH29IMtasWVPl46xZs6bS6/DCCy8YkoyWLVu6zC87pz59+hiFhYUV1vDKK6+Y89577z1DkvH//t//K3eM6dOnG5KM1157zZxXdp0HDRrksm7Zn8m0adNc5p87d87o0aOHYbPZjO+++86cf//99xuSjF27dpnz7rnnHiMyMtJITk42OnXqZM4/deqU4ePjY6SlpZnznnrqKUOSsXTp0nJ1nzp1yigpKSk3/1IX98yoUaNclm3evNnw8/MzHA6HUVBQYM4fPny4IclYvny5y/qlpaVGQkKCERwcbOTn51/x2Nu2bTPsdrths9mM++67z/jggw+MQ4cOXXabK/XriRMnjNOnT5eb//333xshISHGH//4R5f5F5//c889V2671157rVy/lDlz5ky5/gKAyjDsDcA1KTs7W5IUGxvr1nZz586VJI0ZM0ZRUVHmfD8/P82YMUM+Pj6aM2dOtdTYuHFjjRkzxmVejx49FBcXp2+//bZajuHJ85H+b7jhhAkT9PTTTystLU1jx45VnTp1NGvWLJd1X331Vfn5+Wnu3LkKCgpyWTZ27FjVrVtX7777rjmvd+/eCgsL07vvvquSkhKX9efNmye73a577733svX98ssveuedd9S2bVs9/fTTLssCAwM1bdo0GYah9957z5zfrVs3Sa53e7744gulpaWpe/fu+uabb3T27FlJ0po1a1RaWmpuc7FLz1GSwsPD5eNT9X/VhoWFady4cS7z2rZtq4EDByo/P19Lliwx5//5z3+WpHLXffXq1crKytKAAQOq9DKINm3a6J133lGDBg30zjvvqG/fvoqPj1fdunXVp08fLV++vMr1l6lfv76uu+66cvOTkpKUlpamNWvWVDgcsEGDBuawzIpUdI1DQkIqnA8AFWHYGwBL2bZtmyQpLS2t3LLExETFxsYqKytLBQUFV/0WseTk5HLDkSSpUaNG2rRp01Xtu4wnz0f6bSjfpc+ZhIeH64svvnAZ/lRYWKjt27crMjJSr7zySoX7CggI0N69e83poKAg9e/fX7Nnz9aqVav0pz/9SZK0detW7d69W3369FFkZORl69u8ebNKSkpks9nKvZhBkvkL98XHLbt2n3/+uR5//HHt2rVLP//8s7p166ZGjRrp5Zdf1vr163XHHXeYw+Muvt4DBgzQq6++qt69e6tfv37q3r27OnbsqKZNm1621orcfPPNFYaGLl26aN68efruu+80aNAgSdJNN92kzp0765NPPtGRI0fUqFEjSdL//M//SJIee+yxKh+3f//+6tOnj9asWaMNGzbou+++04YNG7R06VItXbpUDzzwgPl666r6+OOP9d///d/asmWLcnNzVVxc7LI8NzdX0dHRLvOSkpLKDVOVpF69eun555/X8OHDtWrVKvXo0UMdO3bUjTfe6FZNAED4AXBNio6O1t69e3Xs2DG3tisoKDC3r2y/hw8fVn5+/lWHhcqe1/Hz81NpaelV7buMJ89HklJTU80H0E+dOqUPPvhAI0aM0L//+79r8+bN5t2nvLw8GYahkydPVvpQfkUefPBBzZ49W/PmzTPDz7x58yTJ/KX/csoefN+8ebM2b95c6Xpnzpwxf27UqJGuv/56rVu3TiUlJeYdoG7duikqKkp2u12ff/657rjjDn3++eeqU6eObr31VnP7du3a6csvv9SUKVO0ePFivf3225J+e55o/PjxV7xbdbEGDRpUOL/supb9eZcZNmyY1q9frzlz5mjixInKycnRsmXLlJycrHbt2lX5uNJvz2vdfvvtuv322yX99grsDz74QIMHD9b8+fPVp0+fKn8M99VXX9WTTz6p8PBw/eEPf1BcXJyCg4Nls9m0dOlSbd++vcKXi1x89/JijRs31rfffqsJEyZo5cqV+t///V9Jv/3ZjRo1So8//rhb5wrAuhj2BuCa1KlTJ0muQ5WqoiwA5OTkVLi8bDjdxUHBZrOV+6/WZfLz8906fnX7PedTXSIiIjR06FD9/e9/19GjRzVs2LBydbVp00aGYVz2n4ulpKTo+uuv17Jly5Sfny+n06kFCxYoMjLSDEOXU3bcv/zlL5c95po1a1y2S0tLU0FBgTZv3qzPP/9cjRs3VtOmTRUSEqJ27drps88+0/Hjx7Vv3z517ty53B29Dh066KOPPlJeXp6++uorjR07VidOnFB6ero+++yzKl/TEydOVDi/7M/30j/Hu+++Ww0aNFBGRoZKSkrcetHBlfj6+qp///76y1/+IknlXgpRmeLiYk2YMEFRUVHavXu3Fi5cqJdeekkTJ07UhAkTKg14ki57F6dFixZauHChfvnlF23ZskUvvviiSktL9cQTTygjI8O9kwNgWYQfANekhx56SHa7XR988EGFr8692MX/hbnsVcoVvdr5wIEDOnr0qBISElzu2oSHh+vIkSPl1i8pKdH333//u+q/VNkv05c+63Ilv+d8qttjjz2mm266SUuWLNFXX30lSQoNDdVNN92k3bt369SpU27tb9CgQSoqKtLChQv18ccfKzc3V+np6VV6Y1q7du3k4+NT7vXUV1L2DM+qVau0fv16l2d6unXrph07dmjhwoUu61YkICBAKSkpmjRpkl577TVJ0ocffljlOrZt26Zff/213PyyP99LXwVut9s1ZMgQHTt2TMuXL9ecOXMUGhpa7tXdV6NsGN7FQfVy/Zqbm6v8/HylpKSUuyN55swZc6jm7+Xn56dbbrlFzzzzjPnq8qVLl17VPgFYB+EHwDWp7GObFy5c0J133qktW7ZUuN7KlSt1xx13mNODBw+WJE2ePFknT54055eUlGjUqFEqLS01v1tTpl27djp8+HC5b61MnjxZP/30U7WcT9lreg8fPuzWdr/nfKqbr6+vObRt9OjR5vynnnpKFy5c0ODBgyu8Q5aXl1fhL8IPPPCAfHx8NH/+fM2fP1+SKvyWT0Xq16+vgQMHasuWLXrhhRcq/OX8xx9/VFZWlsu8sm8evfHGGyooKHAJOGlpaTIMQy+++KI5fbGNGzfq3Llz5Y5TdhcnODi4SrVLvw1rmzRpksu8LVu26N1331VYWJj69OlTbptHHnlEvr6+GjFihLKyspSenl7hc0OVWbBggT799NMKh2Lm5ORo9uzZkqTOnTub8y/Xr/Xr11dwcLC2bt3qMrzQ6XTqiSeeqPBbUFeydevWckP+pN93jQFYG8/8ALhmPf/88youLtbEiRN16623KiUlRW3btlVoaKhOnDih9evXa//+/Wrbtq25TUpKip5++mlNnz5dLVu2VL9+/RQSEqJPPvlEu3btUqdOnfTXv/7V5TijRo3SqlWrdNddd2nAgAGKiIjQxo0blZWVpS5dulzVB0LLdOjQQcHBwXrllVf0yy+/mM8+jBw58rJD1n7P+dSEu+++W8nJyVq3bp35QPrgwYO1detWvfHGG2ratKn5prtTp04pKytL69ev10MPPaT//u//dtlXo0aN1LVrV33++efy8/NT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qxUYGKgRI0boq6++0gsvvKDS0lJvl4RaatKkSfL19dW5c+d0/PhxxcXFmctOnjzJCw+qGeGnlurVq5fOnz9f6fKoqCiNHz/egxWhtmrXrp2++uorde7cudyyhx9+WIZh6NNPP/VCZaht/vCHP7j8AnrxLwiS9N133/G8D6pdx44d1bx5cx08eJDnGFHt+vXr5zJ96Qs1tm7dqubNm3uypFrPZvDVLgAAAAAWwEdOAQAAAFgC4QcAAACAJRB+AAAAAFgC4QcA4BFr165V//799fPPP3u7FACARfG2NwCwkLVr1+qNN94wp318fBQWFqbWrVvr3nvvVUREhBer85wtW7Zo+fLlOnbsmIqKiuRwONSkSROlpaUpOTlZknTq1Cl99tlnateuneLj471aLwCgehB+AMCC+vfvr/r168vpdGr//v1au3at9u3bpxkzZsjf379Gjtm5c2elpKTIbrfXyP6ratmyZXrnnXd04403qnfv3goICFBOTo527typr776ygw/eXl5Wrx4serXr0/4AYBagvADABbUpk0bNW3aVJLUrVs3XXfddfrwww+1ZcsWpaSk1MgxfXx8aixYVVVJSYk++OADtW7dWmPGjCm3vKCgoMZrKCoqKvctDwCAZ/DMDwBALVq0kCSdOHHCZf6xY8c0Y8YMPfTQQxo4cKCeffZZbdmyxVz+448/qn///lq7dm25fX7//ffq37+/tm7dKqnyZ36+++47jRs3Tvfff78eeOABTZ06VUeOHDGXb9myRf3799dPP/1kzvv666/Vv39/vfzyyy77+stf/qL//M//rPQ8f/31V507d0433HBDhcvDwsIkSbt379Zzzz0nSXrjjTfUv39/l/Pcu3ev/v73v+vPf/6z0tPT9ec//1lvvfWWLly44LK/119/Xffff79ycnI0depUPfDAA3rttdckSdnZ2Xr55Zc1dOhQDRw4UI899pheeeUVFRYWVlo/AODqEH4AAGYgCQkJMecdOXJEo0eP1rFjx9S7d2/df//9CggI0EsvvaRvv/1WktS0aVM1aNBAmzZtKrfPjRs3KiQkRElJSZUed/369XrxxRcVGBiogQMHqm/fvjp69KjGjRtn1tS8eXPZbDbt3bvX3G7fvn2y2Wzat2+fOe/06dM6duyYGeQqUqdOHfn7+2vr1q06c+ZMpes1bNhQ/fv3lyR1795dI0aM0IgRI8x9b9q0SefPn9ftt9+uwYMHKykpSStXrtTMmTPL7au0tFRTpkxRnTp1dP/99+u2225TcXGxpkyZov379+uOO+7Qww8/rO7du+vEiRM6e/ZspXUBAK4Ow94AwIIKCwt1+vRp85mfxYsXy26365ZbbjHXeeuttxQZGampU6eaz+n06NFD48aN07vvvqt27dpJkjp06KDly5frzJkzCg0NlSQVFxdr8+bNateunfz8Kv5XTVFRkd58802lpaXp0UcfNeenpqbqySef1JIlS/Too48qNDRUsbGx2rt3r/74xz9K+u3OS/v27fX111/r2LFjatiwoRmELhd+fHx81KtXLy1evFh//vOfdeONN+qGG25QcnKymjRpYq7ncDjUpk0bLVq0SImJiercubPLfu677z6XIXzdu3dXVFSUFixYoNzcXEVGRprLnE6nOnTooPT0dHPeoUOH9PPPP+upp57SbbfdZs7v169fpbUDAK4e4QcALOiFF15wma5Xr55GjhypunXrSpLOnDmjXbt2qX///jp37pzOnTtnrpuUlKRFixbp1KlTioiIUEpKipYuXapvv/1WaWlpkqTt27fr7Nmzl31+aMeOHTp79qw6duyo06dPm/N9fHx0/fXXa/fu3ea85s2bm8Ptzp07p59++kkDBw7U7t27tXfvXjVs2FB79+5VSEiIGjVqdNlz79+/v2JiYrR69Wp9//33+u677/T+++8rISFBI0eOVGxs7BWv38XBp6ioSBcuXFBiYqIMw1BWVpZL+JGk22+/3WU6ODhY0m9DA9u0aaOAgIArHhMAcPUIPwBgQQ8//LCio6NVWFioNWvWaO/evS5vYcvJyZFhGFq4cKEWLlxY4T4KCgoUERGh+Ph4NWzYUBs3bjTDz8aNG3XdddepZcuWldaQnZ0tSZo0aVKFy4OCgsyfW7RooU8//VQ5OTnKycmRzWZTYmKiWrRooX379ql79+7at2+fbrjhBvn4XHlEd6dOndSpUycVFhbqwIEDWrt2rTZs2KBp06ZV6Y13ubm5WrhwobZs2VJumNqlz+z4+vqWe4V4/fr11bNnT3300UfasGGDWrRooVtuuUWdO3c2gxEAoPoRfgDAgpo1a2a+7a1du3YaO3asXn31Vb366qsKDAxUaWmpJOnf//3fK31mJyoqyvy5Q4cOWrJkiU6fPq2goCBt2bJFHTt2lK+vb6U1GIYhSRoxYoQcDke55Rdv27x5c0nSnj179PPPPyshIUGBgYFq3ry5PvnkExUVFSkrK0v33HOPW9chODhYrVu3VuvWreXr66t169bpwIEDuvHGGyvdprS0VC+88ILOnDmju+66Sw0bNlRAQIBOnTqlN954wzyvMn5+fhUGsgceeEBdunTR5s2btWPHDr355ptaunSppkyZYt6BAwBUL8IPAFicj4+P0tPTNXHiRK1cuVK9e/dWgwYNJP0WQFq3bn3FfaSkpGjx4sX65ptvFBYWpnPnzqljx46X3absGGUfWb2cyMhIRUZGat++fTpx4oQZhm688UbNnz9fmzZtUmlp6WVDy5U0bdpU69atU15eniTJZrNVuN7hw4eVnZ2t4cOHKzU11Zy/Y8cOt48ZFxenuLg49e3bVz/88IPGjh2rTz/91O0QBwCoGt72BgDQTTfdpGbNmunjjz/WhQsXFBYWpptuukmfffaZGQYudvEzOpIUGxuruLg4bdy4URs3blR4ePhlXzwg/fbsUFBQkJYsWaLi4uIrHqN58+batWuXDhw4YO47Pj5eQUFBWrp0qfz9/V1eWlCR8+fPKzMzs8Jl3333nSQpJiZGkszncC4d1lZ2F+fiOzyGYWjFihWXPfbFCgsLVVJS4jIvLi5ONptNTqezyvsBALiHOz8AAElSr1699Pe//11r167V7bffrocfflhjx47VqFGj1K1bN9WvX18FBQXKzMzUqVOn9NJLL7lsn5KSooULF8rf319du3a94rM3wcHBGjp0qP7xj3/omWeeUceOHVWnTh3l5uZq27ZtuuGGG/Twww+b67do0UIbNmyQzWYz7/z4+PgoMTFR27dv10033VTpm+XKnD9/XmPGjNH111+v5ORk1a1bV4WFhdq8ebP27t2rW2+9VQkJCZJ+uzMVEhKiTz/9VEFBQQoICND111+vmJgYNWjQQG+//bZOnTql4OBgffPNN5d9dfaldu3apblz5+q2225TTEyMSkpKtH79evn4+Kh9+/ZV3g8AwD2EHwCApN+e/WnQoIGWL1+u7t27KzY2Vi+++KL++c9/au3atfr1118VFham+Ph49e3bt9z2KSkpev/993X+/PnLvuXtYp06dVJ4eLiWLl2qZcuWyel0KiIiQi1atFDXrl1d1i272xMTE6PrrrvOZf727dvNQHQ5ISEhevTRR7Vt2zatXbtW+fn58vHxUUxMjO677z796U9/Mtf18/PT8OHD9d5772n27NkqKSnRsGHD1KVLFz3zzDPmMzp2u13t2rXTH//4R/31r3+t0nnHx8crKSlJW7du1aeffqqAgAA1btxYzz//vBITE6u0DwCA+2zGpU9mAgAAAEAtxDM/AAAAACyB8AMAAADAEgg/AAAAACyB8AMAAADAEgg/AAAAACyB8AMAAADAEgg/AAAAACyB8AMAAADAEgg/AAAAACyB8AMAAADAEgg/AAAAACyB8AMAAADAEgg/AAAAACzh/wM+d62+bCo1UAAAAABJRU5ErkJggg==",
      "text/plain": [
       "<Figure size 1000x500 with 1 Axes>"
      ]
     },
     "metadata": {},
     "output_type": "display_data"
    }
   ],
   "source": [
    "ax = df['Score'].value_counts().sort_index() \\\n",
    "    .plot(kind='bar',\n",
    "          title='Count of Reviews by Stars',\n",
    "          figsize=(10, 5))\n",
    "ax.set_xlabel('Review Stars')\n",
    "plt.show()"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 5,
   "id": "2ed2e8cd",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:43.192548Z",
     "iopub.status.busy": "2024-07-30T14:28:43.192147Z",
     "iopub.status.idle": "2024-07-30T14:28:43.198797Z",
     "shell.execute_reply": "2024-07-30T14:28:43.197594Z"
    },
    "papermill": {
     "duration": 0.018897,
     "end_time": "2024-07-30T14:28:43.201489",
     "exception": false,
     "start_time": "2024-07-30T14:28:43.182592",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "name": "stdout",
     "output_type": "stream",
     "text": [
      "This oatmeal is not good. Its mushy, soft, I don't like it. Quaker Oats is the way to go.\n"
     ]
    }
   ],
   "source": [
    "example = df['Text'][50]\n",
    "print(example)"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 6,
   "id": "916ad61e",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:43.220170Z",
     "iopub.status.busy": "2024-07-30T14:28:43.219788Z",
     "iopub.status.idle": "2024-07-30T14:28:43.242492Z",
     "shell.execute_reply": "2024-07-30T14:28:43.241257Z"
    },
    "papermill": {
     "duration": 0.03524,
     "end_time": "2024-07-30T14:28:43.245223",
     "exception": false,
     "start_time": "2024-07-30T14:28:43.209983",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "data": {
      "text/plain": [
       "['This', 'oatmeal', 'is', 'not', 'good', '.', 'Its', 'mushy', ',', 'soft']"
      ]
     },
     "execution_count": 6,
     "metadata": {},
     "output_type": "execute_result"
    }
   ],
   "source": [
    "tokens = nltk.word_tokenize(example)\n",
    "tokens[:10]"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 7,
   "id": "fa1cfa25",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:43.265404Z",
     "iopub.status.busy": "2024-07-30T14:28:43.265006Z",
     "iopub.status.idle": "2024-07-30T14:28:43.394918Z",
     "shell.execute_reply": "2024-07-30T14:28:43.393641Z"
    },
    "papermill": {
     "duration": 0.142988,
     "end_time": "2024-07-30T14:28:43.397763",
     "exception": false,
     "start_time": "2024-07-30T14:28:43.254775",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "data": {
      "text/plain": [
       "[('This', 'DT'),\n",
       " ('oatmeal', 'NN'),\n",
       " ('is', 'VBZ'),\n",
       " ('not', 'RB'),\n",
       " ('good', 'JJ'),\n",
       " ('.', '.'),\n",
       " ('Its', 'PRP$'),\n",
       " ('mushy', 'NN'),\n",
       " (',', ','),\n",
       " ('soft', 'JJ')]"
      ]
     },
     "execution_count": 7,
     "metadata": {},
     "output_type": "execute_result"
    }
   ],
   "source": [
    "tagged = nltk.pos_tag(tokens)\n",
    "tagged[:10]"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 8,
   "id": "f035ff9d",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:43.416379Z",
     "iopub.status.busy": "2024-07-30T14:28:43.416013Z",
     "iopub.status.idle": "2024-07-30T14:28:43.545575Z",
     "shell.execute_reply": "2024-07-30T14:28:43.544263Z"
    },
    "papermill": {
     "duration": 0.141866,
     "end_time": "2024-07-30T14:28:43.548174",
     "exception": false,
     "start_time": "2024-07-30T14:28:43.406308",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "name": "stdout",
     "output_type": "stream",
     "text": [
      "(S\n",
      "  This/DT\n",
      "  oatmeal/NN\n",
      "  is/VBZ\n",
      "  not/RB\n",
      "  good/JJ\n",
      "  ./.\n",
      "  Its/PRP$\n",
      "  mushy/NN\n",
      "  ,/,\n",
      "  soft/JJ\n",
      "  ,/,\n",
      "  I/PRP\n",
      "  do/VBP\n",
      "  n't/RB\n",
      "  like/VB\n",
      "  it/PRP\n",
      "  ./.\n",
      "  (ORGANIZATION Quaker/NNP Oats/NNPS)\n",
      "  is/VBZ\n",
      "  the/DT\n",
      "  way/NN\n",
      "  to/TO\n",
      "  go/VB\n",
      "  ./.)\n"
     ]
    }
   ],
   "source": [
    "entities = nltk.chunk.ne_chunk(tagged)\n",
    "entities.pprint()"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 9,
   "id": "90c6939b",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:43.567803Z",
     "iopub.status.busy": "2024-07-30T14:28:43.567351Z",
     "iopub.status.idle": "2024-07-30T14:28:43.608323Z",
     "shell.execute_reply": "2024-07-30T14:28:43.607286Z"
    },
    "papermill": {
     "duration": 0.054108,
     "end_time": "2024-07-30T14:28:43.610697",
     "exception": false,
     "start_time": "2024-07-30T14:28:43.556589",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "name": "stderr",
     "output_type": "stream",
     "text": [
      "/opt/conda/lib/python3.10/site-packages/nltk/twitter/__init__.py:20: UserWarning: The twython library has not been installed. Some functionality from the twitter package will not be available.\n",
      "  warnings.warn(\"The twython library has not been installed. \"\n"
     ]
    }
   ],
   "source": [
    "from nltk.sentiment import SentimentIntensityAnalyzer\n",
    "from tqdm.notebook import tqdm\n",
    "\n",
    "sia = SentimentIntensityAnalyzer()"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 10,
   "id": "e9534b87",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:43.629485Z",
     "iopub.status.busy": "2024-07-30T14:28:43.629084Z",
     "iopub.status.idle": "2024-07-30T14:28:43.636667Z",
     "shell.execute_reply": "2024-07-30T14:28:43.635450Z"
    },
    "papermill": {
     "duration": 0.019991,
     "end_time": "2024-07-30T14:28:43.639236",
     "exception": false,
     "start_time": "2024-07-30T14:28:43.619245",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "data": {
      "text/plain": [
       "{'neg': 0.0, 'neu': 0.318, 'pos': 0.682, 'compound': 0.6468}"
      ]
     },
     "execution_count": 10,
     "metadata": {},
     "output_type": "execute_result"
    }
   ],
   "source": [
    "sia.polarity_scores('I am so happy!')"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 11,
   "id": "3f15ddbe",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:43.659749Z",
     "iopub.status.busy": "2024-07-30T14:28:43.659327Z",
     "iopub.status.idle": "2024-07-30T14:28:43.667285Z",
     "shell.execute_reply": "2024-07-30T14:28:43.665652Z"
    },
    "papermill": {
     "duration": 0.020826,
     "end_time": "2024-07-30T14:28:43.669780",
     "exception": false,
     "start_time": "2024-07-30T14:28:43.648954",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "data": {
      "text/plain": [
       "{'neg': 0.451, 'neu': 0.549, 'pos': 0.0, 'compound': -0.6249}"
      ]
     },
     "execution_count": 11,
     "metadata": {},
     "output_type": "execute_result"
    }
   ],
   "source": [
    "sia.polarity_scores('This is the worst thing ever.')"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 12,
   "id": "d99976c0",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:43.689495Z",
     "iopub.status.busy": "2024-07-30T14:28:43.688714Z",
     "iopub.status.idle": "2024-07-30T14:28:43.696393Z",
     "shell.execute_reply": "2024-07-30T14:28:43.695172Z"
    },
    "papermill": {
     "duration": 0.020138,
     "end_time": "2024-07-30T14:28:43.698689",
     "exception": false,
     "start_time": "2024-07-30T14:28:43.678551",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "data": {
      "text/plain": [
       "{'neg': 0.22, 'neu': 0.78, 'pos': 0.0, 'compound': -0.5448}"
      ]
     },
     "execution_count": 12,
     "metadata": {},
     "output_type": "execute_result"
    }
   ],
   "source": [
    "sia.polarity_scores(example)"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 13,
   "id": "b2248ac6",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:43.719640Z",
     "iopub.status.busy": "2024-07-30T14:28:43.718592Z",
     "iopub.status.idle": "2024-07-30T14:28:44.299558Z",
     "shell.execute_reply": "2024-07-30T14:28:44.298211Z"
    },
    "papermill": {
     "duration": 0.594688,
     "end_time": "2024-07-30T14:28:44.302855",
     "exception": false,
     "start_time": "2024-07-30T14:28:43.708167",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "data": {
      "application/vnd.jupyter.widget-view+json": {
       "model_id": "17ab56af02bf4c318bc63325f108adc1",
       "version_major": 2,
       "version_minor": 0
      },
      "text/plain": [
       "  0%|          | 0/500 [00:00<?, ?it/s]"
      ]
     },
     "metadata": {},
     "output_type": "display_data"
    }
   ],
   "source": [
    "res = {}\n",
    "for i, row in tqdm(df.iterrows(), total=len(df)):\n",
    "    text = row['Text']\n",
    "    myid = row['Id']\n",
    "    res[myid] = sia.polarity_scores(text)"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 14,
   "id": "d41ee803",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:44.323013Z",
     "iopub.status.busy": "2024-07-30T14:28:44.322579Z",
     "iopub.status.idle": "2024-07-30T14:28:44.348354Z",
     "shell.execute_reply": "2024-07-30T14:28:44.347189Z"
    },
    "papermill": {
     "duration": 0.03863,
     "end_time": "2024-07-30T14:28:44.350922",
     "exception": false,
     "start_time": "2024-07-30T14:28:44.312292",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [],
   "source": [
    "vaders = pd.DataFrame(res).T\n",
    "vaders = vaders.reset_index().rename(columns={'index': 'Id'})\n",
    "vaders = vaders.merge(df, how='left')"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 15,
   "id": "e08745a6",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:44.372045Z",
     "iopub.status.busy": "2024-07-30T14:28:44.371625Z",
     "iopub.status.idle": "2024-07-30T14:28:44.391055Z",
     "shell.execute_reply": "2024-07-30T14:28:44.389737Z"
    },
    "papermill": {
     "duration": 0.033807,
     "end_time": "2024-07-30T14:28:44.393912",
     "exception": false,
     "start_time": "2024-07-30T14:28:44.360105",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "data": {
      "text/html": [
       "<div>\n",
       "<style scoped>\n",
       "    .dataframe tbody tr th:only-of-type {\n",
       "        vertical-align: middle;\n",
       "    }\n",
       "\n",
       "    .dataframe tbody tr th {\n",
       "        vertical-align: top;\n",
       "    }\n",
       "\n",
       "    .dataframe thead th {\n",
       "        text-align: right;\n",
       "    }\n",
       "</style>\n",
       "<table border=\"1\" class=\"dataframe\">\n",
       "  <thead>\n",
       "    <tr style=\"text-align: right;\">\n",
       "      <th></th>\n",
       "      <th>Id</th>\n",
       "      <th>neg</th>\n",
       "      <th>neu</th>\n",
       "      <th>pos</th>\n",
       "      <th>compound</th>\n",
       "      <th>ProductId</th>\n",
       "      <th>UserId</th>\n",
       "      <th>ProfileName</th>\n",
       "      <th>HelpfulnessNumerator</th>\n",
       "      <th>HelpfulnessDenominator</th>\n",
       "      <th>Score</th>\n",
       "      <th>Time</th>\n",
       "      <th>Summary</th>\n",
       "      <th>Text</th>\n",
       "    </tr>\n",
       "  </thead>\n",
       "  <tbody>\n",
       "    <tr>\n",
       "      <th>0</th>\n",
       "      <td>1</td>\n",
       "      <td>0.000</td>\n",
       "      <td>0.695</td>\n",
       "      <td>0.305</td>\n",
       "      <td>0.9441</td>\n",
       "      <td>B001E4KFG0</td>\n",
       "      <td>A3SGXH7AUHU8GW</td>\n",
       "      <td>delmartian</td>\n",
       "      <td>1</td>\n",
       "      <td>1</td>\n",
       "      <td>5</td>\n",
       "      <td>1303862400</td>\n",
       "      <td>Good Quality Dog Food</td>\n",
       "      <td>I have bought several of the Vitality canned d...</td>\n",
       "    </tr>\n",
       "    <tr>\n",
       "      <th>1</th>\n",
       "      <td>2</td>\n",
       "      <td>0.079</td>\n",
       "      <td>0.853</td>\n",
       "      <td>0.068</td>\n",
       "      <td>-0.1027</td>\n",
       "      <td>B00813GRG4</td>\n",
       "      <td>A1D87F6ZCVE5NK</td>\n",
       "      <td>dll pa</td>\n",
       "      <td>0</td>\n",
       "      <td>0</td>\n",
       "      <td>1</td>\n",
       "      <td>1346976000</td>\n",
       "      <td>Not as Advertised</td>\n",
       "      <td>Product arrived labeled as Jumbo Salted Peanut...</td>\n",
       "    </tr>\n",
       "    <tr>\n",
       "      <th>2</th>\n",
       "      <td>3</td>\n",
       "      <td>0.091</td>\n",
       "      <td>0.754</td>\n",
       "      <td>0.155</td>\n",
       "      <td>0.8265</td>\n",
       "      <td>B000LQOCH0</td>\n",
       "      <td>ABXLMWJIXXAIN</td>\n",
       "      <td>Natalia Corres \"Natalia Corres\"</td>\n",
       "      <td>1</td>\n",
       "      <td>1</td>\n",
       "      <td>4</td>\n",
       "      <td>1219017600</td>\n",
       "      <td>\"Delight\" says it all</td>\n",
       "      <td>This is a confection that has been around a fe...</td>\n",
       "    </tr>\n",
       "    <tr>\n",
       "      <th>3</th>\n",
       "      <td>4</td>\n",
       "      <td>0.000</td>\n",
       "      <td>1.000</td>\n",
       "      <td>0.000</td>\n",
       "      <td>0.0000</td>\n",
       "      <td>B000UA0QIQ</td>\n",
       "      <td>A395BORC6FGVXV</td>\n",
       "      <td>Karl</td>\n",
       "      <td>3</td>\n",
       "      <td>3</td>\n",
       "      <td>2</td>\n",
       "      <td>1307923200</td>\n",
       "      <td>Cough Medicine</td>\n",
       "      <td>If you are looking for the secret ingredient i...</td>\n",
       "    </tr>\n",
       "    <tr>\n",
       "      <th>4</th>\n",
       "      <td>5</td>\n",
       "      <td>0.000</td>\n",
       "      <td>0.552</td>\n",
       "      <td>0.448</td>\n",
       "      <td>0.9468</td>\n",
       "      <td>B006K2ZZ7K</td>\n",
       "      <td>A1UQRSCLF8GW1T</td>\n",
       "      <td>Michael D. Bigham \"M. Wassir\"</td>\n",
       "      <td>0</td>\n",
       "      <td>0</td>\n",
       "      <td>5</td>\n",
       "      <td>1350777600</td>\n",
       "      <td>Great taffy</td>\n",
       "      <td>Great taffy at a great price.  There was a wid...</td>\n",
       "    </tr>\n",
       "  </tbody>\n",
       "</table>\n",
       "</div>"
      ],
      "text/plain": [
       "   Id    neg    neu    pos  compound   ProductId          UserId  \\\n",
       "0   1  0.000  0.695  0.305    0.9441  B001E4KFG0  A3SGXH7AUHU8GW   \n",
       "1   2  0.079  0.853  0.068   -0.1027  B00813GRG4  A1D87F6ZCVE5NK   \n",
       "2   3  0.091  0.754  0.155    0.8265  B000LQOCH0   ABXLMWJIXXAIN   \n",
       "3   4  0.000  1.000  0.000    0.0000  B000UA0QIQ  A395BORC6FGVXV   \n",
       "4   5  0.000  0.552  0.448    0.9468  B006K2ZZ7K  A1UQRSCLF8GW1T   \n",
       "\n",
       "                       ProfileName  HelpfulnessNumerator  \\\n",
       "0                       delmartian                     1   \n",
       "1                           dll pa                     0   \n",
       "2  Natalia Corres \"Natalia Corres\"                     1   \n",
       "3                             Karl                     3   \n",
       "4    Michael D. Bigham \"M. Wassir\"                     0   \n",
       "\n",
       "   HelpfulnessDenominator  Score        Time                Summary  \\\n",
       "0                       1      5  1303862400  Good Quality Dog Food   \n",
       "1                       0      1  1346976000      Not as Advertised   \n",
       "2                       1      4  1219017600  \"Delight\" says it all   \n",
       "3                       3      2  1307923200         Cough Medicine   \n",
       "4                       0      5  1350777600            Great taffy   \n",
       "\n",
       "                                                Text  \n",
       "0  I have bought several of the Vitality canned d...  \n",
       "1  Product arrived labeled as Jumbo Salted Peanut...  \n",
       "2  This is a confection that has been around a fe...  \n",
       "3  If you are looking for the secret ingredient i...  \n",
       "4  Great taffy at a great price.  There was a wid...  "
      ]
     },
     "execution_count": 15,
     "metadata": {},
     "output_type": "execute_result"
    }
   ],
   "source": [
    "vaders.head()"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 16,
   "id": "2974bc1e",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:44.414237Z",
     "iopub.status.busy": "2024-07-30T14:28:44.413827Z",
     "iopub.status.idle": "2024-07-30T14:28:44.772774Z",
     "shell.execute_reply": "2024-07-30T14:28:44.771497Z"
    },
    "papermill": {
     "duration": 0.371947,
     "end_time": "2024-07-30T14:28:44.775236",
     "exception": false,
     "start_time": "2024-07-30T14:28:44.403289",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "data": {
      "image/png": "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vnuMVq1aZSSZ+Ph4k5mZma9ljDFm2rRpxt/f3wQEBJgePXqYkSNHmj/84Q+mYcOGuf7q9uYYVqtWzTRt2tTExMSYQYMGmeeee858+OGHxhhjli9fboKCgozdbjfdunUzw4cPN7169TJlypQxwcHBZuvWrfnah+s9vgcPHjR+fn6mVatWHtc3aNAgI8ksXrw436/jtm3bjCRzzz33GGMu95pKMgMGDPDYPuf91b17dxMWFmb69etnnn76aRMTE+N6b02ZMsUEBQWZXr16mWeffdbEx8cbSWbw4MG51le3bl1Tr14906dPH/P888+bwYMHmzp16hhJpk+fPm5tt2/fbsaOHZvr39ChQ43NZjN+fn7m+PHjrvbefnZbt25tYmJizB//+EfzxBNPmMjISCPJJCYm5us13bdvn5FkIiIizNmzZ6/ZPme/JJno6Gi3fVu7dq2rXWBgoGnatKnp16+f+fOf/2wGDRpkbrnlFiPJ/OUvf8m13pzPdZcuXUyVKlVM//79zYgRI8xrr712zZry6jEyxpjOnTsbSWby5Mlu06/nczFr1ixXL6Un9913n5Fk/vvf/+ban19LTEw0kkxYWJjp27evGTZsmOnYsaORZG677TZz5swZV9vRo0cbSWb58uWuaefOnTMBAQGu1/9Kb731lpHk+uzfzAhGpUyHDh2MJPPuu+9e13IbN250nX678gduRkaG6dKli5FkJkyY4LZMzg+ULl26mIsXL7qmr1+/3kgyFStWNM2aNXPrRt+/f79xOBymUaNGbuvK+cUpybz11ltu8xYtWmQkmbi4OJOVleWafiPBqEmTJubUqVOu6WfPnjW1atXK9Qvn4MGDxuFwmIoVK7ptJysry3Tv3t1Vc36cPXvW9ZrdeeedZvr06SYpKemqIenbb781drvdVKxY0SQlJeWaf/jwYdfjGzmGCQkJuX6xpaammtDQUFOpUiXz7bffus3773//a8qVK2caN26cr3335vj+9re/zfULwxhj0tLSTPny5U316tWvK2A+9thjRpKZNWuWMeby61K1alVTrlw5t18oOXLeX9HR0ebIkSOu6adPnzaVKlUyZcuWNeHh4ea7775zzbt48aKpV6+eCQgIMCdPnnRb3759+3JtIysry/Tt29dIyvO0d45Lly6ZhISEXL+ob+S433fffeb8+fOu6SdPnjQhISEmJCTEXLp06ar1GGNMdna2ad68uZFkGjZsaKZOnWq2bduWK4j9Wk5gy4un1yo9Pd106NDB2O12t+NhzP8+1/Hx8SY5OfmadV8pr2D0ww8/mLJlyxpJZsuWLa7p1/u5uHDhggkJCTFVqlQxGRkZbu2PHz9u/P39TZMmTTzuz5XWrFljJJmWLVvmOjX5wQcfGElm6NChrmmrV682ksywYcNc01asWOH640CS2+vctWtXI8kcOnToKq/WzYFgVMrUq1cv118J+TFw4EAjyfzjH//INW/37t3Gz8/PxMTEuE3P+YHi6YdYzl/Vq1evzjWvXbt2xm63u/1Sy/nF+etfjjlyflBcea7/RoLR559/nmuZnN62K3shXnzxRSPJvPDCC7na79+/3/j5+eU7GBljzM6dO02jRo1cIUGSCQoKMnfddZd5++233QKmMcY8+eSTRpJ54403rrnuGzmGO3bsyLXM5MmTjSQzdepUj9sbOnSokZTrl4Mn3hzfJUuWGEnmySefdGubM05o3Lhx19xujrNnz5oKFSqYkJAQc+HCBdf05557zkgy77zzTq5lct5f7733Xq55jz76qJFkxowZk2tezl/1+R2XsnXr1nztT842//SnP7lNv5Hjvnfv3lzL5AS1XwfSvPz000+mXbt2bu9ph8NhWrRoYV5++WWPofNawSgvH330kZFkZsyY4TY95/2zaNGi615nzmvx9NNPm7Fjx5q//OUvpm/fvq7xRVcGC2O8+1zk9HAuWbLEre2rr75qJJkpU6Z43J8r5QQXT38gGWNMo0aNTEREhOv5hQsXTGBgoFtIGz58uLHb7a4wnfOeycrKMqGhoaZ27dp5vUw3FS5tQb5s27ZNktShQ4dc8+rUqaOoqCgdPHhQZ86cUUhIiGteaGioatWqlWuZyMhIHTx4UE2bNs0175ZbblFmZqZOnDihW265xW3enXfeKT+/3EPj2rVrpy+++ELbt293nfe/Ec2aNcs1rXr16pKk06dPu6blvC6ethkbG6vq1avrp59+yvd2GzRooO3bt2vLli1au3attm3bpk2bNmn9+vVav369pk2bprVr16pixYqSpP/85z+SpPvuu++a6/b2GAYGBqpBgwa5ltm0aZMkaefOnR7vP7Rnzx5Jl8cm3HbbbdesT7q+43vfffcpJiZG//znPzVp0iSVLVtWkjRt2jTZ7XYNHDgw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9BUrVhh/f//r/lxfy9Uu1z937pypUqWKsdvtZs+ePcaYG/tc3H333UaSa9D1U0895bGdp/3Jud1Hy5YtPb6Xz549azZt2pRres6ViZUrV3bdqiJHzZo1XbdQeeaZZzzWcjNijFEpNGrUKNe56ObNm6tVq1Zq1qyZ6ytB1q9fr71797qNp2jVqpVGjBihV155RfXr11ePHj1Urlw5LV++XElJSWrTpo2GDx9e6LV36tRJzz33nJYvX66GDRtq3759+vjjjxUYGKj333/fbXzFAw88oNq1a2v27Nk6cuSIbr/9dh06dEiffPKJHnjgAY83P7xeNWvW1Msvv6znnntOjRs31sMPP6yQkBB99tlncjqdatCggXbt2pWvdR07dkyPPvqonnzySbVp08Z1w8Djx49rxYoVOnHihOLi4vTCCy+4lrntttv0zjvvaPDgwWrcuLFrn0+dOqVvvvlGwcHBWrt2raSCP4aVKlXSggUL1K1bN91xxx1KSEjQb37zG9lsNh0+fFibNm3SqVOndPHixXyv83qOb47WrVurYcOG2rlzpxwOhwYMGJDv7c2dO1dOp1P333//VcckDRw4UP/61780bdo0DRo0KN/rz6++ffvq1Vdf1dChQ7V27VrVrl1be/fudX1dRs7plRwvvPCC9u/fryZNmmjDhg3asGFDrnUOHTpUoaGhPv3snjlzRk8//bSGDx+u1q1bq379+qpQoYJ+/vlnrVmzRgcOHFDlypX1+uuvuy2XkJCgOXPm6P7771eTJk3kcDh011136a677tITTzyhDz74QD179lSPHj0UGRmppKQkrVixQg899FCu16owlS1bVn/+85/1zDPP6IUXXtDs2bNv6HPRr18/rVq1yjXO53pOQyckJOjll1/WyJEjVbt2bXXu3FkxMTE6e/asfvrpJ33xxRdq06ZNrhv3JiQkaMmSJfr5559zjSFKSEjQ9OnTXY9LDV8nM/jOd999Z5588knzm9/8xlSoUME4HA5TtWpV06lTJ/Pee+/lujTcGGNmz55tWrdubcqXL2/KlCljbrvtNvPiiy+6XeKcozB6jMaOHWs2btxoEhISTIUKFUz58uXNPffcYzZv3uxxXYcOHTIPPfSQqVixogkMDDTNmjUzH3300TUv1/fE01/6OWbNmmUaN25sypQpY8LDw83vfvc7c/To0ev6SzUtLc3M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SJJCQ0N19913a+/evTdSGwAUmbJBISpXtqLKla2oskEhvi4HgI943WNks9mUlZWV5/zs7Oxcl/MDQHF1b4cnfF0CgGLA6x6junXr6rPPPlNycnKueSkpKVq5cqVuvfXWGyoOAACgKHndY9SrVy+NHTtWQ4cOVYsWLVStWjVJ0rFjx7Rlyxb5+/urV69eBVYoAABAYfM6GMXExGjixImaPXu2tmzZokuXLkmSAgIC1KhRIz3yyCOKiooqsEIBAAAK2w3dxygqKkrDhw9Xdna20tLSJEnBwcHy8/P6DB0AAIDPFMidr202m2ugNQOuAQBASXVDwejIkSOaO3eudu7cqfT0dElSmTJl1LBhQ/Xs2VM1atQokCIBAACKgtfB6Pvvv9fEiRNljFGzZs0UGRkp6X+Dr3fs2KFRo0apXr16BVYsAABAYfI6GM2YMUMhISFKTExUeHi427yUlBSNHTtWM2fO1EsvvXTDRQIAABQFr0dJHz58WB07dswViiQpPDxcHTt21OHDh2+oOAAAgKLkdTCKiIhQZmZmnvMzMzNVqVIlb1cPAABQ5LwORj169NDy5cv1448/5pp38OBBrVixQj179ryR2gAAAIqU12OM9uzZo5CQED3//POqW7euqlatKkk6fvy49uzZoxo1amjPnj3as2ePaxmbzaZHH330xqsGAAAoBF4Ho88++8z1ePfu3dq9e7fb/EOHDunQoUO5liMYAQCA4srrYDR37tyCrAMAAMDn+O4OAAAAS4F8JUh2drbOnz/vcV758uULYhMAAACFzutglJmZqU8++URr167VqVOnlJ2d7bFdYZ9yW7FihRYvXiyn06no6GgNGDBAcXFxHtuuWrVK69evd91fKTY2Vr169cqzPQAAKF28DkbTpk3TF198oTp16qh58+YqW7ZsQdaVLxs3btTMmTM1aNAg1a5dW0uXLtWECRM0efJkhYSE5Gr/3XffqXXr1qpbt64cDoc++eQTvfjii3rjjTcUFhZW5PUDAIDixetg9J///Ed33XWXhgwZUpD1XJclS5YoISFB7du3lyQNGjRI27Zt09q1a9W1a9dc7Z966im354MHD9bXX3+t//73v2rbtm1RlAwAAIoxrwdflylTRrVr1y7IWq5LZmamDhw4oPj4eNc0Pz8/xcfHu9076WrS09OVmZnJOCgAACDpBnqMWrdurW3b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Nm/erMTERFWuXNnXJeEK2dnZysjI8HUZpU58fHyuq2X//ve/KzIyUg888AChyMcuXryoEydO6M477/R1KYWKYFTK5Lyxc/z888/68ccfVb58+Zt+QF1xMn36dH311VcaMWKEgoKC5HQ6JUlly5blFEIRmzVrlho1aqTw8HBdvHhRX331lb777rtcVw6i8AUFBeUaZ1emTBlVqFCB8Xc+MHPmTDVr1kzh4eE6ffq05s2bJz8/P7Vp08bXpRUqglEps3//fo0bN871fObMmZKktm3basiQIb4qq9RZuXKlJCkxMdFt+hNPPKF27doVfUGl2JkzZ/T222/r9OnTKlu2rKKjozV69Gg1aNDA16UBPpWamqopU6bol19+UXBwsG699VZNmDBBwcHBvi6tUNmMMcbXRQAAABQHnLAFAACwEIwAAAAsBCMAAAALwQgAAMBCMAIAALAQjAAAACwEIwAAAAvBCAAAwMKdrwGUWIcOHdL8+fO1f/9+nTlzRuXLl1dUVJSaNWum++67z9flASiBuPM1gBJp9+7dGjdunMLDw9W2bVuFhobq1KlT2rt3r06cOKG33nrL1yUCKIHoMQJQIn388ccqW7asXnrpJZUrV85t3pkzZ4qsjvT0dJUpU6bItgegcBGMAJRIJ0+eVPXq1XOFIkkKCQlxe75+/XotX75chw8flsPhUI0aNdS9e3c1bNjQ1eazzz7TZ599phMnTqhChQpq3ry5evXq5bb+xMRE/fLLLxoyZIhmzJih/fv36+6771b//v2VkZGhhQsX6ssvv9SpU6cUEhKi1q1b6+GHH5bD4Si8FwJAgSIYASiRIiIitGfPHh06dEg1atTIs938+fM1f/581a1bVw899JDsdrv27dunpKQkVzCaN2+eFixYoPj4eHXs2FHHjh3TypUrtX//fo0fP152+/9+VP7yyy+aOHGiWrVqpTvvvFMhISHKzs7WK6+8oh9++EEJCQmKiorSoUOHtHTpUh07dkwjRowo9NcDQMEgGAEoke6//35NnDhRI0aMUFxcnG699VbFx8frN7/5jSvInDhxQgsWLFCLFi307LPPys/vfxfi5gyvTEtL06JFi9SwYUONHDnS1SYyMlLvv/++vvzyS7Vv3961nNPp1KBBg3TPPfe4pq1fv167du3SuHHjdOutt7qmV69eXe+++652796tunXrFurrAaBgcLk+gBKpQYMGevHFF9WsWTP99NNP+vTTTzVhwgQNHjxYW7ZskSRt3rxZxhj16NHDLRRJks1mkyTt2rVLmZmZ6ty5s1ubu+++W0FBQdq2bZvbcg6Hwy0oSdJ//vMfRUVFKTIyUmlpaa5/9evXlyR9++23Bb7/AAoHPUYASqy4uDgNGzZMmZmZ+vHHH7V582YtXbpUr7/+ul599VWdPHlSNptNUVFRea4jJSVF0uUeoivZ7XZVqVLFNT9HWFiY26k1STp+/LiOHj2qgQMHetxGUQ4GB3BjCEYASjy73a64uDjFxcUpMjJS77zzjjZt2lQo2woICMg1zRijGjVqqG/fvh6XCQ8PL5RaABQ8ghGAm0psbKwk6fTp06pataqMMTpy5Ihq1qzpsX1OaDl27JiqVKnimp6Zmamff/5Z8fHx19xmlSpV9NNPPyk+Pt51ig5AycQYIwAlUlJSkjzdn3b79u2SLp8aa9GihWw2mxYsWKDs7Gy3djnLNmjQQHa7XcuXL3db35o1a3T+/Hk1adLkmrW0bNlSqampWr16da55ly5d0sWLF69r3wD4Dj1GAEqkDz74QOnp6WrRooUiIyOVmZmpPXv2aOPGjYqIiFD79u1Vrlw5de/eXR999JHGjh2rFi1ayOFwaN++fQoLC1Pv3r0VHBysrl27asGCBZo4caKaNm3quly/Vq1auvPOO69Zy1133aVNmzbp3XffVVJSkm699VZlZ2fr6NGj2rRpk0aPHq1atWoVwasC4EbxlSAASqQdO3Zo06ZN2rNnj06dOqXMzEyFh4erUaNGevDBB91u8rh27VqtWLFCR44cUUBAgKKjo9W9e3c1aNDA1WbFihWuGzyWL19et99+e543eHz99ddz1ZOZmamlS5dq/fr1OnHihAICAlSlShU1a9ZMnTt3VtmyZQv3BQFQIAhGAAAAFsYYAQAAWAhGAAAAFoIRAACAhWAEAABgIRgBAABYCEYAAAAWghEAAICFYAQAAGAhGAEAAFgIRgAAABaCEQAAgIVgBAAAYCEYAQAAWP4/hDkx1H+m8jgAAAAASUVORK5CYII=",
      "text/plain": [
       "<Figure size 640x480 with 1 Axes>"
      ]
     },
     "metadata": {},
     "output_type": "display_data"
    }
   ],
   "source": [
    "ax = sns.barplot(data=vaders, x='Score', y='compound')\n",
    "ax.set_title('Compund Score by Amazon Star Review')\n",
    "plt.show()"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 17,
   "id": "589ee758",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:44.796730Z",
     "iopub.status.busy": "2024-07-30T14:28:44.796308Z",
     "iopub.status.idle": "2024-07-30T14:28:45.694646Z",
     "shell.execute_reply": "2024-07-30T14:28:45.693559Z"
    },
    "papermill": {
     "duration": 0.911746,
     "end_time": "2024-07-30T14:28:45.696948",
     "exception": false,
     "start_time": "2024-07-30T14:28:44.785202",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "data": {
      "image/png": "iVBORw0KGgoAAAANSUhEUgAABKUAAAEiCAYAAAAoMGGMAAAAOXRFWHRTb2Z0d2FyZQBNYXRwbG90bGliIHZlcnNpb24zLjcuNSwgaHR0cHM6Ly9tYXRwbG90bGliLm9yZy/xnp5ZAAAACXBIWXMAAA9hAAAPYQGoP6dpAABXyElEQVR4nO39e3xU1dn//79nmETCIQmRQIJAQkgCYsNJwAIihyhGiJRTFVGLpUQtVLS1cFf4IrEaa6RYULC3ioJ4yyHyETAQEYoIIigIKEQs4ViOgYQwiYqEDLN/f/DL1DETIIc5ZOb1fDx4uPeetfe+1gRzMdestbbJMAxDAAAAAAAAgAeZvR0AAAAAAAAAAg9FKQAAAAAAAHgcRSkAAAAAAAB4HEUpAAAAAAAAeBxFKQAAAAAAAHgcRSkAAAAAAAB4HEUpAAAAAAAAeBxFKQAAAAAAAHgcRSkAAAAAAAB4HEUpwMd88sknMplMSk9Pr9J5sbGxio2NdUtMAABcyYIFC2QymbRgwQJvhwIAcJN+/frJZDJ5Owz4GYpSwE+YTCanP/Xq1VPTpk01YMAALVq0yKuxkQQAwHeU54mYmBhduHDBZZvY2FiZTCbZbDYPR3c5vn79+nn8vgAQSHw9F1TVQw89JJPJpCNHjng7FAQQi7cDAHzR9OnTJUllZWX697//rZUrV2rDhg368ssv9dJLL7n13j169NC3336rpk2bVum89evXuykiAEBljh49qlmzZukvf/mLt0MBAHhJoOSChQsX6vz5894OA36GohTgws+nzq1fv1533HGHZs2apYkTJ7p1mlyDBg3Uvn37Kp/Xtm1bN0QDAKhMkyZNZDKZ9MILL2jcuHFV/jIBAFD3BVIuaN26tbdDgB9i+h5wDZKTk9W+fXsZhqHt27c7ju/YsUMjRoxQs2bNdN111ykmJkbjx4/XqVOnKlzj9OnT+vOf/6x27dqpYcOGCg8PV7t27fTQQw/p0KFDjnY/X1PqyJEjMplM2rhxoyTnKYY/nZrx8zWlXnjhBZlMJs2ePdtln06ePCmLxaJu3bo5HbfZbHr11Vf1y1/+UqGhoWrQoIG6dOmiOXPmyG63V/WtAwC/1aBBA02bNk3FxcV65plnqnTuF198oZEjRyoqKkrBwcFq1aqVHnnkEZ08ebJC2yutGZieni6TyaRPPvlE0n/XdpKkjRs3OuWMn+eVhx56SHl5ebr33nvVrFkzmc1mx3V27Nihxx9/XJ06dVJERITq16+vhIQEPfnkkzp37lyV+goA/sxTuUCStm/froEDB6px48YKDQ3V7bffrq1bt1bIBeVWrFihBx54QImJiWrYsKEaNmyom2++WS+//HKFf9ebTCa9/fbbkqQ2bdo4csdP88/PlxNZsmSJTCaT/vjHP7qMt7S0VE2aNFF0dHSF6YuLFy9W//79FR4ervr16+vGG2/Uc889p9LS0mt9++AnGCkFXCPDMCTJ8Yt41apVGjFihAzD0MiRIxUTE6MdO3bon//8p1auXKnNmzerTZs2kqTz58+rd+/eOnjwoO644w7dfffdMgxD//nPf7Ry5UqNHDlScXFxLu8bHh6u6dOna8GCBfrPf/7jmFoo6Yojth588EFNnTpVCxcu1OOPP17h9f/7v//TpUuX9NBDDzmOlZWV6e6779ZHH32kdu3aafTo0apfv742bNigxx57TF988YXeeeedqr51AOC3JkyYoDlz5ui1117TxIkTlZCQcNVz3nrrLT388MO67rrrNGTIELVq1Ur79+/XvHnzlJ2drc8//7za30Z37txZ06dP1zPPPKOYmBin3/E/X2Pq4MGDuuWWW5SYmKj7779fP/74o0JDQyVJb7zxhpYvX66+ffvq9ttvl91u144dO/TSSy/pww8/1BdffKHGjRtXK0YA8DeeyAWbNm3SwIEDdenSJQ0fPlxt27bVnj171L9/fw0YMMDlPf7yl7/IbDbrlltu0Q033KDi4mJ9/PHHevzxx7V9+3anf9dPnz5dK1as0Ndff63HH39c4eHhkuT4rytDhw5VWFiYFi1apBkzZshicS4vrFy5UlarVU8++aTTa2PHjtX8+fPVsmVLjRgxQuHh4fr88881bdo0rV+/XuvWratwLfgxA4CDJMPV/xbr1q0zTCaTYTKZjCNHjhjfffedERERYZjNZmPTpk1ObV944QVDknHHHXc4jn3wwQeGJOOJJ56ocO3S0lKjpKTEsb9hwwZDkjF9+nSndn379nUZW7mYmBgjJibG6djAgQMNScaePXsqtO/QoYMRHBxsFBYWOo5Nnz7dkGT84Q9/MGw2m+O4zWYzxo4da0gyVqxYUWkMABAoJBk33HCDYRiG8d577xmSjGHDhjm1iYmJMSQZZWVljmP79u0zgoKC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n33mMo7rr79ex44dq1YfYmNjJVX84uXMmTOaMGFCta4JAIGktnNB79691bZtW23YsEEffvihU9vXX3/d5TUq+12+a9cu/e1vf3MZd00+b5SvHfXmm29q8eLFatq0qVJTUyu0+9Of/qSLFy9q7NixLkf7njt3zrF+LwIDa0oB1dCoUSO99dZb+vWvf62+ffvq17/+tVq3bq0dO3Zo7dq1ioqK0muvveZov27dOk2aNEk9e/ZUYmKimjVrpuPHj2vlypUym82aNGnSVe+ZnJys9957T8OHD9egQYMUEhKimJgYPfjgg1c998EHH9TTTz+t6dOnq6ysrMK3FuWmTZumr7/+Wv/7v/+r7OxsDRgwQDfccIPOnDmj/fv367PPPlNGRoY6dOhw7W8WAASQiIgITZkyRZMnT3b5evv27fXWW29p7Nixuummm5SSkqLExESVlZXp6NGj+vTTTxUZGal///vfjnMee+wxzZ8/X7///e+1fv16tWrVSl999ZW2bt2q1NRUrVq1qsJ9kpOTtWTJEt19993q2rWrgoKCdNttt+m22267ah+6d++u3r176/3331evXr1066236vTp0/rwww/Vrl07tWjRovpvEAAEgNrOBWazWfPmzVNKSoqGDBmiESNGqG3bttq9e7fWrVunu+66Sx9++KHM5v+OOfnNb36jGTNm6IknntCGDRuUkJCg/fv3a9WqVRo+fLiWLl1aIa7k5GTNmDFDaWlpGjFihBo3bqzw8HD94Q9/uGqfhw0bptDQUM2aNUtlZWV67LHHXK6ZO3bsWO3YsUOvvvqq2rZtqzvvvFOtW7dWUVGRDh8+rE2bNum3v/2t/vd///da327UdQYAB0lGVf632LZtmzF06FCjadOmRlBQkNGqVSvj0UcfNU6cOOHUbu/evcYf//hH4+abbzaaNm1qBAcHGzExMcaIESOMzz77zKnthg0bDEnG9OnTnY7bbDbjqaeeMtq0aWNYLBZDktG3b1/H6zExMUZMTEylsSYnJxuSDIvFYuTn51fazm63GwsXLjQGDBhgNGnSxAgKCjJatGhh9O7d28jIyDCOHj16ze8PAPgrScYNN9zg8rULFy4YsbGxjpxSVlZWoc3u3buNMWPGGK1btzaCg4ONJk2aGDfddJPx8MMPG+vXr6/Q/tNPPzX69OljhISEGI0bNzYGDRpkfP3118b0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924lJCRIurxO1aVLlypMzTKbzTIMo9JYgoKCFBQU5PK1K51X1/lz364mkPsOVAcLnQMAAADwK6mpqVq/fr0++eQTHT9+XPPmzVNpaan69esnSZozZ44WLVrkaD9o0CB9/fXXys7O1okTJ5SVlaWDBw86ilgNGjRQhw4d9H//93/65ptvdObMGX3yySfauHGjo/AFAKg6RkoBAAAA8Cu9evVSSUmJsrKyZLVaFRsbqylTpjim4xUWFjqNemrXrp0mTpyoJUuWaPHixYqOjtakSZPUunVrR5snnnhCixYt0ssvv6zvv/9ekZGRuu+++3THHXd4unsA4DdqvShVWlqqzz77TDabTV26dLmmOYQAgMD1zDPPXLWNyWTS008/7YFoAADecLVcYDKZFBQUpOuvv1433XSTfvnLX6pevXpXPCclJaXS6Xrp6ekVjvXs2VM9e/as9Hrh4eEaP378Fe8JAKiaGhWl/vnPf+rAgQOaOXOmpMtzradOnapjx45JujzM9emnn1abNm1qHikAwC8ZhlFhjQ673a6CggKdPXtWUVFRioiI8FJ0AABPMAxDRUVFOn36tBo2bOj4YrugoEA//PCDoqKi1KBBAx04cEDr16/XihUrNG3aNIWGhno5cgBATdSoKPXNN9+oT58+jv3Nmzfr2LFjeuyxxxQbG6uZM2fqvffe0+TJk2scKADAP7n6trrcjh079Prrr+s3v/mN5wICAHjcqFGjNGPGDE2YMEG33nqrzObLS9/a7XZt2rRJ77zzjiZMmKCEhARt3LhRr732mhYtWqRHH33Uy5EDAGqiRgudW61Wp+l527ZtU1xcnG699Va1bNlSycnJOnDgQI2DBAAEpptvvll9+vTRggULvB0KAMCN3nnnHfXr10+33XaboyAlXX66Xb9+/dSvXz+9/fbbMplM6tevn/r3769du3Z5MWIAQG2o0Uip6667TufPn5ckXbp0SXv37nWat12/fn3H64C/+eiDU2679o/nLzltu/Nedw6Jdtu1gdrQvHlzrVmzxtthAADc6D//+Y/TDIyfi4yM1EcffeTYj4uL08aNGz0RGlCnPfvssyoqKpIkRUREaNq0aV6OCHBWo5FScXFxWr9+vQ4fPqz3339fP/74o7p16+Z4/fTp0woLC6txkACAwHTp0iVt3bpVjRs39nYoAAA3atKkib744gvZ7fYK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",
      "text/plain": [
       "<Figure size 1200x300 with 3 Axes>"
      ]
     },
     "metadata": {},
     "output_type": "display_data"
    }
   ],
   "source": [
    "fig, axs = plt.subplots(1, 3, figsize=(12, 3))\n",
    "sns.barplot(data=vaders, x='Score', y='pos', ax=axs[0])\n",
    "sns.barplot(data=vaders, x='Score', y='neu', ax=axs[1])\n",
    "sns.barplot(data=vaders, x='Score', y='neg', ax=axs[2])\n",
    "axs[0].set_title('Positive')\n",
    "axs[1].set_title('Neutral')\n",
    "axs[2].set_title('Negative')\n",
    "plt.tight_layout()\n",
    "plt.show()"
   ]
  },
  {
   "cell_type": "markdown",
   "id": "7dd923cd",
   "metadata": {
    "papermill": {
     "duration": 0.009783,
     "end_time": "2024-07-30T14:28:45.716880",
     "exception": false,
     "start_time": "2024-07-30T14:28:45.707097",
     "status": "completed"
    },
    "tags": []
   },
   "source": [
    "Roberta Pretrained Model"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 18,
   "id": "d1c3caf0",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:45.738861Z",
     "iopub.status.busy": "2024-07-30T14:28:45.738424Z",
     "iopub.status.idle": "2024-07-30T14:28:50.949517Z",
     "shell.execute_reply": "2024-07-30T14:28:50.947495Z"
    },
    "papermill": {
     "duration": 5.226689,
     "end_time": "2024-07-30T14:28:50.953739",
     "exception": false,
     "start_time": "2024-07-30T14:28:45.727050",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [],
   "source": [
    "from transformers import AutoTokenizer\n",
    "from transformers import AutoModelForSequenceClassification\n",
    "from scipy.special import softmax"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 19,
   "id": "0238bba4",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:50.976399Z",
     "iopub.status.busy": "2024-07-30T14:28:50.975788Z",
     "iopub.status.idle": "2024-07-30T14:28:56.328485Z",
     "shell.execute_reply": "2024-07-30T14:28:56.327195Z"
    },
    "papermill": {
     "duration": 5.367104,
     "end_time": "2024-07-30T14:28:56.331258",
     "exception": false,
     "start_time": "2024-07-30T14:28:50.964154",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "data": {
      "application/vnd.jupyter.widget-view+json": {
       "model_id": "1eb7f6bd3e7a4d55b51ecc841c6ff7df",
       "version_major": 2,
       "version_minor": 0
      },
      "text/plain": [
       "config.json:   0%|          | 0.00/747 [00:00<?, ?B/s]"
      ]
     },
     "metadata": {},
     "output_type": "display_data"
    },
    {
     "data": {
      "application/vnd.jupyter.widget-view+json": {
       "model_id": "ac0f5b6004ec411585cbc84c9a166273",
       "version_major": 2,
       "version_minor": 0
      },
      "text/plain": [
       "vocab.json:   0%|          | 0.00/899k [00:00<?, ?B/s]"
      ]
     },
     "metadata": {},
     "output_type": "display_data"
    },
    {
     "data": {
      "application/vnd.jupyter.widget-view+json": {
       "model_id": "321083a2769a4650b12ecf921c3fd0db",
       "version_major": 2,
       "version_minor": 0
      },
      "text/plain": [
       "merges.txt:   0%|          | 0.00/456k [00:00<?, ?B/s]"
      ]
     },
     "metadata": {},
     "output_type": "display_data"
    },
    {
     "data": {
      "application/vnd.jupyter.widget-view+json": {
       "model_id": "43fd20a14bf640779e805741b7a5918f",
       "version_major": 2,
       "version_minor": 0
      },
      "text/plain": [
       "special_tokens_map.json:   0%|          | 0.00/150 [00:00<?, ?B/s]"
      ]
     },
     "metadata": {},
     "output_type": "display_data"
    },
    {
     "data": {
      "application/vnd.jupyter.widget-view+json": {
       "model_id": "9f51d2db1ee246059b03ad96f17e709f",
       "version_major": 2,
       "version_minor": 0
      },
      "text/plain": [
       "pytorch_model.bin:   0%|          | 0.00/499M [00:00<?, ?B/s]"
      ]
     },
     "metadata": {},
     "output_type": "display_data"
    },
    {
     "name": "stderr",
     "output_type": "stream",
     "text": [
      "/opt/conda/lib/python3.10/site-packages/torch/_utils.py:831: UserWarning: TypedStorage is deprecated. It will be removed in the future and UntypedStorage will be the only storage class. This should only matter to you if you are using storages directly.  To access UntypedStorage directly, use tensor.untyped_storage() instead of tensor.storage()\n",
      "  return self.fget.__get__(instance, owner)()\n"
     ]
    }
   ],
   "source": [
    "MODEL = f\"cardiffnlp/twitter-roberta-base-sentiment\"\n",
    "tokenizer = AutoTokenizer.from_pretrained(MODEL)\n",
    "model = AutoModelForSequenceClassification.from_pretrained(MODEL)"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 20,
   "id": "9a3e09fe",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:56.355968Z",
     "iopub.status.busy": "2024-07-30T14:28:56.355346Z",
     "iopub.status.idle": "2024-07-30T14:28:56.364581Z",
     "shell.execute_reply": "2024-07-30T14:28:56.362817Z"
    },
    "papermill": {
     "duration": 0.024351,
     "end_time": "2024-07-30T14:28:56.366915",
     "exception": false,
     "start_time": "2024-07-30T14:28:56.342564",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "name": "stdout",
     "output_type": "stream",
     "text": [
      "This oatmeal is not good. Its mushy, soft, I don't like it. Quaker Oats is the way to go.\n"
     ]
    },
    {
     "data": {
      "text/plain": [
       "{'neg': 0.22, 'neu': 0.78, 'pos': 0.0, 'compound': -0.5448}"
      ]
     },
     "execution_count": 20,
     "metadata": {},
     "output_type": "execute_result"
    }
   ],
   "source": [
    "print(example)\n",
    "sia.polarity_scores(example)"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 21,
   "id": "8c20205d",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:56.391204Z",
     "iopub.status.busy": "2024-07-30T14:28:56.390841Z",
     "iopub.status.idle": "2024-07-30T14:28:57.396721Z",
     "shell.execute_reply": "2024-07-30T14:28:57.395267Z"
    },
    "papermill": {
     "duration": 1.021777,
     "end_time": "2024-07-30T14:28:57.400033",
     "exception": false,
     "start_time": "2024-07-30T14:28:56.378256",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "name": "stdout",
     "output_type": "stream",
     "text": [
      "{'roberta_neg': 0.97635514, 'roberta_neu': 0.020687453, 'roberta_pos': 0.0029573678}\n"
     ]
    }
   ],
   "source": [
    "# Run for Roberta Model\n",
    "encoded_text = tokenizer(example, return_tensors='pt')\n",
    "output = model(**encoded_text)\n",
    "scores = output[0][0].detach().numpy()\n",
    "scores = softmax(scores)\n",
    "scores_dict = {\n",
    "    'roberta_neg' : scores[0],\n",
    "    'roberta_neu' : scores[1],\n",
    "    'roberta_pos' : scores[2]\n",
    "}\n",
    "print(scores_dict)"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 22,
   "id": "ddfdb8da",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:57.426477Z",
     "iopub.status.busy": "2024-07-30T14:28:57.425916Z",
     "iopub.status.idle": "2024-07-30T14:28:57.432587Z",
     "shell.execute_reply": "2024-07-30T14:28:57.431348Z"
    },
    "papermill": {
     "duration": 0.022443,
     "end_time": "2024-07-30T14:28:57.434796",
     "exception": false,
     "start_time": "2024-07-30T14:28:57.412353",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [],
   "source": [
    "def polarity_scores_roberta(example):\n",
    "    encoded_text = tokenizer(example, return_tensors='pt')\n",
    "    output = model(**encoded_text)\n",
    "    scores = output[0][0].detach().numpy()\n",
    "    scores = softmax(scores)\n",
    "    scores_dict = {\n",
    "        'roberta_neg' : scores[0],\n",
    "        'roberta_neu' : scores[1],\n",
    "        'roberta_pos' : scores[2]\n",
    "    }\n",
    "    return scores_dict"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 23,
   "id": "39ac2af4",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:28:57.459183Z",
     "iopub.status.busy": "2024-07-30T14:28:57.458776Z",
     "iopub.status.idle": "2024-07-30T14:30:26.205963Z",
     "shell.execute_reply": "2024-07-30T14:30:26.204765Z"
    },
    "papermill": {
     "duration": 88.762123,
     "end_time": "2024-07-30T14:30:26.208208",
     "exception": false,
     "start_time": "2024-07-30T14:28:57.446085",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "data": {
      "application/vnd.jupyter.widget-view+json": {
       "model_id": "bbe944828c324942817c46082a5cefe4",
       "version_major": 2,
       "version_minor": 0
      },
      "text/plain": [
       "  0%|          | 0/500 [00:00<?, ?it/s]"
      ]
     },
     "metadata": {},
     "output_type": "display_data"
    },
    {
     "name": "stdout",
     "output_type": "stream",
     "text": [
      "Broke for id 83\n",
      "Broke for id 187\n"
     ]
    }
   ],
   "source": [
    "res = {}\n",
    "for i, row in tqdm(df.iterrows(), total=len(df)):\n",
    "    try:\n",
    "        text = row['Text']\n",
    "        myid = row['Id']\n",
    "        vader_result = sia.polarity_scores(text)\n",
    "        vader_result_rename = {}\n",
    "        for key, value in vader_result.items():\n",
    "            vader_result_rename[f\"vader_{key}\"] = value\n",
    "        roberta_result = polarity_scores_roberta(text)\n",
    "        both = {**vader_result_rename, **roberta_result}\n",
    "        res[myid] = both\n",
    "    except RuntimeError:\n",
    "        print(f'Broke for id {myid}')"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 24,
   "id": "216a8334",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:30:26.233201Z",
     "iopub.status.busy": "2024-07-30T14:30:26.232783Z",
     "iopub.status.idle": "2024-07-30T14:30:26.258886Z",
     "shell.execute_reply": "2024-07-30T14:30:26.257588Z"
    },
    "papermill": {
     "duration": 0.042621,
     "end_time": "2024-07-30T14:30:26.262419",
     "exception": false,
     "start_time": "2024-07-30T14:30:26.219798",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [],
   "source": [
    "results_df = pd.DataFrame(res).T\n",
    "results_df = results_df.reset_index().rename(columns={'index': 'Id'})\n",
    "results_df = results_df.merge(df, how='left')"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 25,
   "id": "af654796",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:30:26.289433Z",
     "iopub.status.busy": "2024-07-30T14:30:26.288959Z",
     "iopub.status.idle": "2024-07-30T14:30:26.297471Z",
     "shell.execute_reply": "2024-07-30T14:30:26.296004Z"
    },
    "papermill": {
     "duration": 0.024474,
     "end_time": "2024-07-30T14:30:26.300476",
     "exception": false,
     "start_time": "2024-07-30T14:30:26.276002",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "data": {
      "text/plain": [
       "Index(['Id', 'vader_neg', 'vader_neu', 'vader_pos', 'vader_compound',\n",
       "       'roberta_neg', 'roberta_neu', 'roberta_pos', 'ProductId', 'UserId',\n",
       "       'ProfileName', 'HelpfulnessNumerator', 'HelpfulnessDenominator',\n",
       "       'Score', 'Time', 'Summary', 'Text'],\n",
       "      dtype='object')"
      ]
     },
     "execution_count": 25,
     "metadata": {},
     "output_type": "execute_result"
    }
   ],
   "source": [
    "results_df.columns"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 26,
   "id": "a4b0b2b6",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:30:26.327328Z",
     "iopub.status.busy": "2024-07-30T14:30:26.326938Z",
     "iopub.status.idle": "2024-07-30T14:30:42.667147Z",
     "shell.execute_reply": "2024-07-30T14:30:42.665977Z"
    },
    "papermill": {
     "duration": 16.364793,
     "end_time": "2024-07-30T14:30:42.678596",
     "exception": false,
     "start_time": "2024-07-30T14:30:26.313803",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "name": "stderr",
     "output_type": "stream",
     "text": [
      "/opt/conda/lib/python3.10/site-packages/seaborn/_oldcore.py:1119: FutureWarning: use_inf_as_na option is deprecated and will be removed in a future version. Convert inf values to NaN before operating instead.\n",
      "  with pd.option_context('mode.use_inf_as_na', True):\n",
      "/opt/conda/lib/python3.10/site-packages/seaborn/_oldcore.py:1075: FutureWarning: When grouping with a length-1 list-like, you will need to pass a length-1 tuple to get_group in a future version of pandas. Pass `(name,)` instead of `name` to silence this warning.\n",
      "  data_subset = grouped_data.get_group(pd_key)\n",
      "/opt/conda/lib/python3.10/site-packages/seaborn/_oldcore.py:1119: FutureWarning: use_inf_as_na option is deprecated and will be removed in a future version. Convert inf values to NaN before operating instead.\n",
      "  with pd.option_context('mode.use_inf_as_na', True):\n",
      "/opt/conda/lib/python3.10/site-packages/seaborn/_oldcore.py:1075: FutureWarning: When grouping with a length-1 list-like, you will need to pass a length-1 tuple to get_group in a future version of pandas. Pass `(name,)` instead of `name` to silence this warning.\n",
      "  data_subset = grouped_data.get_group(pd_key)\n",
      "/opt/conda/lib/python3.10/site-packages/seaborn/_oldcore.py:1119: FutureWarning: use_inf_as_na option is deprecated and will be removed in a future version. Convert inf values to NaN before operating instead.\n",
      "  with pd.option_context('mode.use_inf_as_na', True):\n",
      "/opt/conda/lib/python3.10/site-packages/seaborn/_oldcore.py:1075: FutureWarning: When grouping with a length-1 list-like, you will need to pass a length-1 tuple to get_group in a future version of pandas. Pass `(name,)` instead of `name` to silence this warning.\n",
      "  data_subset = grouped_data.get_group(pd_key)\n",
      "/opt/conda/lib/python3.10/site-packages/seaborn/_oldcore.py:1119: FutureWarning: use_inf_as_na option is deprecated and will be removed in a future version. Convert inf values to NaN before operating instead.\n",
      "  with pd.option_context('mode.use_inf_as_na', True):\n",
      "/opt/conda/lib/python3.10/site-packages/seaborn/_oldcore.py:1075: FutureWarning: When grouping with a length-1 list-like, you will need to pass a length-1 tuple to get_group in a future version of pandas. Pass `(name,)` instead of `name` to silence this warning.\n",
      "  data_subset = grouped_data.get_group(pd_key)\n",
      "/opt/conda/lib/python3.10/site-packages/seaborn/_oldcore.py:1119: FutureWarning: use_inf_as_na option is deprecated and will be removed in a future version. Convert inf values to NaN before operating instead.\n",
      "  with pd.option_context('mode.use_inf_as_na', True):\n",
      "/opt/conda/lib/python3.10/site-packages/seaborn/_oldcore.py:1075: FutureWarning: When grouping with a length-1 list-like, you will need to pass a length-1 tuple to get_group in a future version of pandas. Pass `(name,)` instead of `name` to silence this warning.\n",
      "  data_subset = grouped_data.get_group(pd_key)\n",
      "/opt/conda/lib/python3.10/site-packages/seaborn/_oldcore.py:1119: FutureWarning: use_inf_as_na option is deprecated and will be removed in a future version. Convert inf values to NaN before operating instead.\n",
      "  with pd.option_context('mode.use_inf_as_na', True):\n",
      "/opt/conda/lib/python3.10/site-packages/seaborn/_oldcore.py:1075: FutureWarning: When grouping with a length-1 list-like, you will need to pass a length-1 tuple to get_group in a future version of pandas. Pass `(name,)` instead of `name` to silence this warning.\n",
      "  data_subset = grouped_data.get_group(pd_key)\n"
     ]
    },
    {
     "data": {
      "text/plain": [
       "<Figure size 1558.88x1500 with 42 Axes>"
      ]
     },
     "metadata": {},
     "output_type": "display_data"
    }
   ],
   "source": [
    "sns.pairplot(data=results_df,\n",
    "             vars=['vader_neg', 'vader_neu', 'vader_pos',\n",
    "                  'roberta_neg', 'roberta_neu', 'roberta_pos'],\n",
    "            hue='Score',\n",
    "            palette='tab10')\n",
    "plt.show()"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 27,
   "id": "742f9158",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:30:42.727551Z",
     "iopub.status.busy": "2024-07-30T14:30:42.727170Z",
     "iopub.status.idle": "2024-07-30T14:30:42.744464Z",
     "shell.execute_reply": "2024-07-30T14:30:42.743090Z"
    },
    "papermill": {
     "duration": 0.045427,
     "end_time": "2024-07-30T14:30:42.747065",
     "exception": false,
     "start_time": "2024-07-30T14:30:42.701638",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "data": {
      "text/plain": [
       "'I felt energized within five minutes, but it lasted for about 45 minutes. I paid $3.99 for this drink. I could have just drunk a cup of coffee and saved my money.'"
      ]
     },
     "execution_count": 27,
     "metadata": {},
     "output_type": "execute_result"
    }
   ],
   "source": [
    "results_df.query('Score == 1') \\\n",
    "    .sort_values('roberta_pos', ascending=False)['Text'].values[0]"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 28,
   "id": "0ec6141a",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:30:42.797048Z",
     "iopub.status.busy": "2024-07-30T14:30:42.796646Z",
     "iopub.status.idle": "2024-07-30T14:30:42.810538Z",
     "shell.execute_reply": "2024-07-30T14:30:42.809465Z"
    },
    "papermill": {
     "duration": 0.041055,
     "end_time": "2024-07-30T14:30:42.812706",
     "exception": false,
     "start_time": "2024-07-30T14:30:42.771651",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "data": {
      "text/plain": [
       "'So we cancelled the order.  It was cancelled without any problem.  That is a positive note...'"
      ]
     },
     "execution_count": 28,
     "metadata": {},
     "output_type": "execute_result"
    }
   ],
   "source": [
    "results_df.query('Score == 1') \\\n",
    "    .sort_values('vader_pos', ascending=False)['Text'].values[0]"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 29,
   "id": "2517089e",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:30:42.862150Z",
     "iopub.status.busy": "2024-07-30T14:30:42.861773Z",
     "iopub.status.idle": "2024-07-30T14:30:42.876688Z",
     "shell.execute_reply": "2024-07-30T14:30:42.875391Z"
    },
    "papermill": {
     "duration": 0.043263,
     "end_time": "2024-07-30T14:30:42.879734",
     "exception": false,
     "start_time": "2024-07-30T14:30:42.836471",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "data": {
      "text/plain": [
       "'this was sooooo deliscious but too bad i ate em too fast and gained 2 pds! my fault'"
      ]
     },
     "execution_count": 29,
     "metadata": {},
     "output_type": "execute_result"
    }
   ],
   "source": [
    "#Negative 5 star review\n",
    "results_df.query('Score == 5') \\\n",
    "    .sort_values('roberta_neg', ascending=False)['Text'].values[0]"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": 30,
   "id": "688cc98e",
   "metadata": {
    "execution": {
     "iopub.execute_input": "2024-07-30T14:30:42.929633Z",
     "iopub.status.busy": "2024-07-30T14:30:42.928592Z",
     "iopub.status.idle": "2024-07-30T14:30:42.943753Z",
     "shell.execute_reply": "2024-07-30T14:30:42.942388Z"
    },
    "papermill": {
     "duration": 0.043138,
     "end_time": "2024-07-30T14:30:42.946432",
     "exception": false,
     "start_time": "2024-07-30T14:30:42.903294",
     "status": "completed"
    },
    "tags": []
   },
   "outputs": [
    {
     "data": {
      "text/plain": [
       "'this was sooooo deliscious but too bad i ate em too fast and gained 2 pds! my fault'"
      ]
     },
     "execution_count": 30,
     "metadata": {},
     "output_type": "execute_result"
    }
   ],
   "source": [
    "results_df.query('Score == 5') \\\n",
    "    .sort_values('vader_neg', ascending=False)['Text'].values[0]"
   ]
  }
 ],
 "metadata": {
  "kaggle": {
   "accelerator": "none",
   "dataSources": [
    {
     "datasetId": 18,
     "sourceId": 2157,
     "sourceType": "datasetVersion"
    }
   ],
   "dockerImageVersionId": 30746,
   "isGpuEnabled": false,
   "isInternetEnabled": true,
   "language": "python",
   "sourceType": "notebook"
  },
  "kernelspec": {
   "display_name": "Python 3",
   "language": "python",
   "name": "python3"
  },
  "language_info": {
   "codemirror_mode": {
    "name": "ipython",
    "version": 3
   },
   "file_extension": ".py",
   "mimetype": "text/x-python",
   "name": "python",
   "nbconvert_exporter": "python",
   "pygments_lexer": "ipython3",
   "version": "3.10.13"
  },
  "papermill": {
   "default_parameters": {},
   "duration": 136.718715,
   "end_time": "2024-07-30T14:30:44.698498",
   "environment_variables": {},
   "exception": null,
   "input_path": "__notebook__.ipynb",
   "output_path": "__notebook__.ipynb",
   "parameters": {},
   "start_time": "2024-07-30T14:28:27.979783",
   "version": "2.5.0"
  },
  "widgets": {
   "application/vnd.jupyter.widget-state+json": {
    "state": {
     "02e930a0d73541b2813870aeb331dc5b": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "ProgressStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "ProgressStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "bar_color": null,
       "description_width": ""
      }
     },
     "051b772512a342d5b07c57fa042ae9c3": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "064b0b192eea493d9d4892ddb64cb46c": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "ProgressStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "ProgressStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "bar_color": null,
       "description_width": ""
      }
     },
     "0de25d4bbc474e2e85bf67ad79c2018a": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "13f322ccfb3e419f991d0e8ba23d55ae": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HTMLModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HTMLModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HTMLView",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_cda600d93bdb41a29398c33e691ceee0",
       "placeholder": "​",
       "style": "IPY_MODEL_3b62d9af27d84489833bba725820f410",
       "value": "merges.txt: 100%"
      }
     },
     "1510cfddd072448a9e597b934e21ce0c": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HTMLModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HTMLModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HTMLView",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_5a3941c605b248e8a66f8be3be554353",
       "placeholder": "​",
       "style": "IPY_MODEL_b3518b01d8bf4d51bc4e134018270217",
       "value": "vocab.json: 100%"
      }
     },
     "17ab56af02bf4c318bc63325f108adc1": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HBoxModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HBoxModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HBoxView",
       "box_style": "",
       "children": [
        "IPY_MODEL_8220ed3903a04d54be3c2cd6590dadfe",
        "IPY_MODEL_f9e07e5cd9914f33b3295ec5704bc0d7",
        "IPY_MODEL_806a03646d4c486987049b8e81663bda"
       ],
       "layout": "IPY_MODEL_eb11b37e94204976b67732a6f594a1f2"
      }
     },
     "1b6870d663d04420af9132f9d9d2051a": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "1c5f70860a0440e186f6c83f3ba46f5f": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "1eb7f6bd3e7a4d55b51ecc841c6ff7df": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HBoxModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HBoxModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HBoxView",
       "box_style": "",
       "children": [
        "IPY_MODEL_a019d25fef03413698b51ccd05c96f06",
        "IPY_MODEL_7a58aed1e58d4da1a0f2264f49f30984",
        "IPY_MODEL_2b8d0a25599d47778bbc61a4adb94979"
       ],
       "layout": "IPY_MODEL_f9881b08ec05411da7e4977a20b03351"
      }
     },
     "24653dc3b3e744f7800a986df7750909": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "25c70992be7741d9bd9e8d7436780a52": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HTMLModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HTMLModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HTMLView",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_0de25d4bbc474e2e85bf67ad79c2018a",
       "placeholder": "​",
       "style": "IPY_MODEL_f8e664acf83d47ceb12839bf990147be",
       "value": " 899k/899k [00:00&lt;00:00, 2.72MB/s]"
      }
     },
     "2b8d0a25599d47778bbc61a4adb94979": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HTMLModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HTMLModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HTMLView",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_65a90b76769f488ea35f45ba6f37d382",
       "placeholder": "​",
       "style": "IPY_MODEL_f50f58d782e74efbb4cdd691ccf8a3e2",
       "value": " 747/747 [00:00&lt;00:00, 47.1kB/s]"
      }
     },
     "321083a2769a4650b12ecf921c3fd0db": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HBoxModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HBoxModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HBoxView",
       "box_style": "",
       "children": [
        "IPY_MODEL_13f322ccfb3e419f991d0e8ba23d55ae",
        "IPY_MODEL_68b773c0a02140ba8e6d80a2fb061ca8",
        "IPY_MODEL_a173c1831a0c49998a19e4afec975182"
       ],
       "layout": "IPY_MODEL_c6f9f52dce984136901e93d51d700936"
      }
     },
     "326b1ccc0e2945de990a351569e7500f": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HTMLModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HTMLModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HTMLView",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_439fdbc23cdc4a1ea24589cf046255fe",
       "placeholder": "​",
       "style": "IPY_MODEL_73193752c41a490b86b7269c11b73391",
       "value": " 500/500 [01:28&lt;00:00,  5.43it/s]"
      }
     },
     "32ac8f3880ec488f8277fc3746255315": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "ProgressStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "ProgressStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "bar_color": null,
       "description_width": ""
      }
     },
     "34d3930e8c644b4bb51be2c728e00ed5": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "35aa51c459024490bcc89e1793f536ec": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "3b62d9af27d84489833bba725820f410": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "DescriptionStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "DescriptionStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "description_width": ""
      }
     },
     "3d0cd8ea6ccc4dfdb2976b88c7847967": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "DescriptionStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "DescriptionStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "description_width": ""
      }
     },
     "3e76ff4510594f7680eff1d1f00968a8": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "3ea7d0c1ad94417f83810ed262640003": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "FloatProgressModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "FloatProgressModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "ProgressView",
       "bar_style": "success",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_eb90ba5573d14f0f93413752d85bd6fd",
       "max": 150.0,
       "min": 0.0,
       "orientation": "horizontal",
       "style": "IPY_MODEL_02e930a0d73541b2813870aeb331dc5b",
       "value": 150.0
      }
     },
     "439fdbc23cdc4a1ea24589cf046255fe": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "43fd20a14bf640779e805741b7a5918f": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HBoxModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HBoxModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HBoxView",
       "box_style": "",
       "children": [
        "IPY_MODEL_d8acaa332a64464da2deab0deef02738",
        "IPY_MODEL_3ea7d0c1ad94417f83810ed262640003",
        "IPY_MODEL_50934a2d8a9049fc8cc4e173ae68edfb"
       ],
       "layout": "IPY_MODEL_24653dc3b3e744f7800a986df7750909"
      }
     },
     "485b81e8e60f4b5785f28617cf964d4e": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "DescriptionStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "DescriptionStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "description_width": ""
      }
     },
     "4fec5f1ed3874599b27e74607f2396ce": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "50934a2d8a9049fc8cc4e173ae68edfb": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HTMLModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HTMLModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HTMLView",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_051b772512a342d5b07c57fa042ae9c3",
       "placeholder": "​",
       "style": "IPY_MODEL_5779717a505646c0a7bd0cf933e87083",
       "value": " 150/150 [00:00&lt;00:00, 10.0kB/s]"
      }
     },
     "51761300793f4b1db7ca9bf137697bfb": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "5779717a505646c0a7bd0cf933e87083": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "DescriptionStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "DescriptionStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "description_width": ""
      }
     },
     "5a0f8547c40f495fb1c96352b2eca5d9": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "DescriptionStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "DescriptionStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "description_width": ""
      }
     },
     "5a3941c605b248e8a66f8be3be554353": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "60a4afde759d47abb5aac69237af6a9d": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "DescriptionStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "DescriptionStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "description_width": ""
      }
     },
     "65a90b76769f488ea35f45ba6f37d382": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "68b773c0a02140ba8e6d80a2fb061ca8": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "FloatProgressModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "FloatProgressModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "ProgressView",
       "bar_style": "success",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_51761300793f4b1db7ca9bf137697bfb",
       "max": 456318.0,
       "min": 0.0,
       "orientation": "horizontal",
       "style": "IPY_MODEL_ee19254c8fe34c1b92dd9fb8f707d216",
       "value": 456318.0
      }
     },
     "6e08c00eebe54e3bbb086d140c942839": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "73193752c41a490b86b7269c11b73391": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "DescriptionStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "DescriptionStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "description_width": ""
      }
     },
     "75914b524b4a469a809a31d32105fa1b": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "75ecf5ddd4df44ea9cf58a246d2c2fec": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "FloatProgressModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "FloatProgressModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "ProgressView",
       "bar_style": "success",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_e7f750ff9ae244c8bdaaf91308fdfbd7",
       "max": 898822.0,
       "min": 0.0,
       "orientation": "horizontal",
       "style": "IPY_MODEL_81e40a65804248e7ab5d189901044b44",
       "value": 898822.0
      }
     },
     "7a2bea8b11a14394ab9d845740938cbe": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "7a58aed1e58d4da1a0f2264f49f30984": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "FloatProgressModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "FloatProgressModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "ProgressView",
       "bar_style": "success",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_ed9e1e992567476e8a7d0454ba52b423",
       "max": 747.0,
       "min": 0.0,
       "orientation": "horizontal",
       "style": "IPY_MODEL_064b0b192eea493d9d4892ddb64cb46c",
       "value": 747.0
      }
     },
     "7e3e20c0fcd44c6caab27bebdb1adeae": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "806a03646d4c486987049b8e81663bda": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HTMLModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HTMLModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HTMLView",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_7e3e20c0fcd44c6caab27bebdb1adeae",
       "placeholder": "​",
       "style": "IPY_MODEL_3d0cd8ea6ccc4dfdb2976b88c7847967",
       "value": " 500/500 [00:00&lt;00:00, 887.48it/s]"
      }
     },
     "81e40a65804248e7ab5d189901044b44": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "ProgressStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "ProgressStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "bar_color": null,
       "description_width": ""
      }
     },
     "8220ed3903a04d54be3c2cd6590dadfe": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HTMLModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HTMLModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HTMLView",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_75914b524b4a469a809a31d32105fa1b",
       "placeholder": "​",
       "style": "IPY_MODEL_e0b5826b3fe24f54bcaab33b7456f3ac",
       "value": "100%"
      }
     },
     "8c23d30c99aa4326adca1fcc028e4396": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "DescriptionStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "DescriptionStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "description_width": ""
      }
     },
     "8c659a172f814ee39ebadc0b176e34c0": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "ProgressStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "ProgressStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "bar_color": null,
       "description_width": ""
      }
     },
     "9f51d2db1ee246059b03ad96f17e709f": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HBoxModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HBoxModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HBoxView",
       "box_style": "",
       "children": [
        "IPY_MODEL_dbbee3f254f2409fbc9aa2c04b7a6665",
        "IPY_MODEL_d168cc4c977d403e9010fcbeb8559959",
        "IPY_MODEL_b98cdb40738948398645a73111cca312"
       ],
       "layout": "IPY_MODEL_f3706b0afdcf4d6e90e08dfe3c3f1060"
      }
     },
     "a019d25fef03413698b51ccd05c96f06": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HTMLModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HTMLModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HTMLView",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_6e08c00eebe54e3bbb086d140c942839",
       "placeholder": "​",
       "style": "IPY_MODEL_60a4afde759d47abb5aac69237af6a9d",
       "value": "config.json: 100%"
      }
     },
     "a173c1831a0c49998a19e4afec975182": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HTMLModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HTMLModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HTMLView",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_34d3930e8c644b4bb51be2c728e00ed5",
       "placeholder": "​",
       "style": "IPY_MODEL_485b81e8e60f4b5785f28617cf964d4e",
       "value": " 456k/456k [00:00&lt;00:00, 1.89MB/s]"
      }
     },
     "a354807d2d244a62abba0b791942b101": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "DescriptionStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "DescriptionStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "description_width": ""
      }
     },
     "a62f71c0245f4b8a863a1625ddea1ed4": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "DescriptionStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "DescriptionStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "description_width": ""
      }
     },
     "ac0f5b6004ec411585cbc84c9a166273": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HBoxModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HBoxModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HBoxView",
       "box_style": "",
       "children": [
        "IPY_MODEL_1510cfddd072448a9e597b934e21ce0c",
        "IPY_MODEL_75ecf5ddd4df44ea9cf58a246d2c2fec",
        "IPY_MODEL_25c70992be7741d9bd9e8d7436780a52"
       ],
       "layout": "IPY_MODEL_7a2bea8b11a14394ab9d845740938cbe"
      }
     },
     "b30300255aa64a6e91e15eb481fa6c90": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HTMLModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HTMLModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HTMLView",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_fbcff612f2b94e3eb924422d1704f83d",
       "placeholder": "​",
       "style": "IPY_MODEL_5a0f8547c40f495fb1c96352b2eca5d9",
       "value": "100%"
      }
     },
     "b3518b01d8bf4d51bc4e134018270217": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "DescriptionStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "DescriptionStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "description_width": ""
      }
     },
     "b98cdb40738948398645a73111cca312": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HTMLModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HTMLModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HTMLView",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_1c5f70860a0440e186f6c83f3ba46f5f",
       "placeholder": "​",
       "style": "IPY_MODEL_a62f71c0245f4b8a863a1625ddea1ed4",
       "value": " 499M/499M [00:01&lt;00:00, 347MB/s]"
      }
     },
     "bbe944828c324942817c46082a5cefe4": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HBoxModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HBoxModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HBoxView",
       "box_style": "",
       "children": [
        "IPY_MODEL_b30300255aa64a6e91e15eb481fa6c90",
        "IPY_MODEL_c183b79721af45d797af41982ab442e1",
        "IPY_MODEL_326b1ccc0e2945de990a351569e7500f"
       ],
       "layout": "IPY_MODEL_4fec5f1ed3874599b27e74607f2396ce"
      }
     },
     "bf7ad5ea973549e69e799c46e23c232e": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "ProgressStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "ProgressStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "bar_color": null,
       "description_width": ""
      }
     },
     "c0fecc7f36fb46798828a65ddcde1ec4": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "c183b79721af45d797af41982ab442e1": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "FloatProgressModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "FloatProgressModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "ProgressView",
       "bar_style": "success",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_1b6870d663d04420af9132f9d9d2051a",
       "max": 500.0,
       "min": 0.0,
       "orientation": "horizontal",
       "style": "IPY_MODEL_bf7ad5ea973549e69e799c46e23c232e",
       "value": 500.0
      }
     },
     "c6f9f52dce984136901e93d51d700936": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "cda600d93bdb41a29398c33e691ceee0": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "d168cc4c977d403e9010fcbeb8559959": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "FloatProgressModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "FloatProgressModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "ProgressView",
       "bar_style": "success",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_e8ccbacf7e774f1ab5e71c2dbbf65d18",
       "max": 498679497.0,
       "min": 0.0,
       "orientation": "horizontal",
       "style": "IPY_MODEL_32ac8f3880ec488f8277fc3746255315",
       "value": 498679497.0
      }
     },
     "d8acaa332a64464da2deab0deef02738": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HTMLModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HTMLModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HTMLView",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_c0fecc7f36fb46798828a65ddcde1ec4",
       "placeholder": "​",
       "style": "IPY_MODEL_8c23d30c99aa4326adca1fcc028e4396",
       "value": "special_tokens_map.json: 100%"
      }
     },
     "dbbee3f254f2409fbc9aa2c04b7a6665": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "HTMLModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "HTMLModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "HTMLView",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_35aa51c459024490bcc89e1793f536ec",
       "placeholder": "​",
       "style": "IPY_MODEL_a354807d2d244a62abba0b791942b101",
       "value": "pytorch_model.bin: 100%"
      }
     },
     "e0b5826b3fe24f54bcaab33b7456f3ac": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "DescriptionStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "DescriptionStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "description_width": ""
      }
     },
     "e7f750ff9ae244c8bdaaf91308fdfbd7": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "e8ccbacf7e774f1ab5e71c2dbbf65d18": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "eb11b37e94204976b67732a6f594a1f2": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "eb90ba5573d14f0f93413752d85bd6fd": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "ed9e1e992567476e8a7d0454ba52b423": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "ee19254c8fe34c1b92dd9fb8f707d216": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "ProgressStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "ProgressStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "bar_color": null,
       "description_width": ""
      }
     },
     "f3706b0afdcf4d6e90e08dfe3c3f1060": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "f50f58d782e74efbb4cdd691ccf8a3e2": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "DescriptionStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "DescriptionStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "description_width": ""
      }
     },
     "f8e664acf83d47ceb12839bf990147be": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "DescriptionStyleModel",
      "state": {
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "DescriptionStyleModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "StyleView",
       "description_width": ""
      }
     },
     "f9881b08ec05411da7e4977a20b03351": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     },
     "f9e07e5cd9914f33b3295ec5704bc0d7": {
      "model_module": "@jupyter-widgets/controls",
      "model_module_version": "1.5.0",
      "model_name": "FloatProgressModel",
      "state": {
       "_dom_classes": [],
       "_model_module": "@jupyter-widgets/controls",
       "_model_module_version": "1.5.0",
       "_model_name": "FloatProgressModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/controls",
       "_view_module_version": "1.5.0",
       "_view_name": "ProgressView",
       "bar_style": "success",
       "description": "",
       "description_tooltip": null,
       "layout": "IPY_MODEL_3e76ff4510594f7680eff1d1f00968a8",
       "max": 500.0,
       "min": 0.0,
       "orientation": "horizontal",
       "style": "IPY_MODEL_8c659a172f814ee39ebadc0b176e34c0",
       "value": 500.0
      }
     },
     "fbcff612f2b94e3eb924422d1704f83d": {
      "model_module": "@jupyter-widgets/base",
      "model_module_version": "1.2.0",
      "model_name": "LayoutModel",
      "state": {
       "_model_module": "@jupyter-widgets/base",
       "_model_module_version": "1.2.0",
       "_model_name": "LayoutModel",
       "_view_count": null,
       "_view_module": "@jupyter-widgets/base",
       "_view_module_version": "1.2.0",
       "_view_name": "LayoutView",
       "align_content": null,
       "align_items": null,
       "align_self": null,
       "border": null,
       "bottom": null,
       "display": null,
       "flex": null,
       "flex_flow": null,
       "grid_area": null,
       "grid_auto_columns": null,
       "grid_auto_flow": null,
       "grid_auto_rows": null,
       "grid_column": null,
       "grid_gap": null,
       "grid_row": null,
       "grid_template_areas": null,
       "grid_template_columns": null,
       "grid_template_rows": null,
       "height": null,
       "justify_content": null,
       "justify_items": null,
       "left": null,
       "margin": null,
       "max_height": null,
       "max_width": null,
       "min_height": null,
       "min_width": null,
       "object_fit": null,
       "object_position": null,
       "order": null,
       "overflow": null,
       "overflow_x": null,
       "overflow_y": null,
       "padding": null,
       "right": null,
       "top": null,
       "visibility": null,
       "width": null
      }
     }
    },
    "version_major": 2,
    "version_minor": 0
   }
  }
 },
 "nbformat": 4,
 "nbformat_minor": 5
}